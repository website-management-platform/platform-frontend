import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { FiBriefcase, FiPlus } from "react-icons/fi";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import { toast } from "@/components/Toast/toast";
import { usePlatformCan } from "@/auth/api";
import { useConsumedSearchParam } from "@/hooks/useConsumedSearchParam";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUrlListFilters } from "@/hooks/useUrlListFilters";
import { formatDate } from "@/utils/format";
import ListState from "../../../lifecycle/components/ListState";
import ListToolbar from "../../../lifecycle/components/ListToolbar";
import StatusBadge from "../../../lifecycle/components/StatusBadge";
import TenantFormModal from "../../components/TenantFormModal";
import { useTenants } from "../../api";
import "./tenant_list.scss";

const PAGE_SIZE = 20;
const FILTER_DEFAULTS = { ara: "", durum: "", sayfa: 1 };

const TenantList = () => {
  usePageTitle("Müşteriler");
  const can = usePlatformCan();
  const navigate = useNavigate();
  const { filters, search, setSearch, setFilter, page, setPage, clear, filtered } = useUrlListFilters(FILTER_DEFAULTS);
  // Genel bakıştaki "Yeni müşteri" kısayolu ?yeni=1 ile gelir.
  const openOnArrival = useConsumedSearchParam("yeni") === "1";
  const [createOpen, setCreateOpen] = useState(openOnArrival);
  const tenantsQuery = useTenants({ q: filters.ara || undefined, status: filters.durum || undefined, page, size: PAGE_SIZE });
  const canManage = can("platform.tenant.manage");

  return (
    <div className="tenant_list">
      <PageHeader
        title="Müşteriler"
        description="Platformdaki kişi ve kuruluş hesapları; her müşterinin tek hesabı ve siteleri ayrı tutulur."
        actions={canManage && <Button icon={FiPlus} onClick={() => setCreateOpen(true)}>Yeni müşteri</Button>}
      />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchLabel="Müşteri adı veya anahtarla ara"
        status={filters.durum}
        onStatusChange={(value) => setFilter("durum", value)}
      />
      <ListState
        query={tenantsQuery}
        filtered={filtered}
        onClearFilters={clear}
        empty={{
          icon: FiBriefcase,
          title: "Henüz müşteri yok",
          description: "İlk müşteriyi oluşturduktan sonra ona site ve kullanıcı ekleyebilirsiniz.",
          action: canManage && <Button icon={FiPlus} onClick={() => setCreateOpen(true)}>Yeni müşteri</Button>,
        }}
      >
        <Table variant="bordered" hoverable caption="Müşteri listesi" hideCaption className="tenant_list_table">
          <thead>
            <tr>
              <th scope="col">Müşteri</th>
              <th scope="col" className="tenant_list_number">Site</th>
              <th scope="col">Hesap</th>
              <th scope="col">Durum</th>
              <th scope="col" className="tenant_list_end">Oluşturma</th>
            </tr>
          </thead>
          <tbody>
            {tenantsQuery.data?.items.map((tenant) => (
              <tr key={tenant.id}>
                <td>
                  <Link to={`/musteriler/${tenant.id}`} className="tenant_list_name">{tenant.displayName}</Link>
                </td>
                <td className="tenant_list_number">{tenant.siteCount} / {tenant.quota.maxSites}</td>
                <td className="tenant_list_account">{tenant.account?.email ?? "—"}</td>
                <td><StatusBadge status={tenant.status} /></td>
                <td className="tenant_list_end">{formatDate(tenant.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} pageCount={Math.max(1, Math.ceil((tenantsQuery.data?.total ?? 0) / PAGE_SIZE))} onChange={setPage} />
      </ListState>
      {createOpen && canManage && (
        <TenantFormModal
          open
          onClose={() => setCreateOpen(false)}
          onSaved={(tenant) => {
            setCreateOpen(false);
            toast.success(`${tenant.displayName} oluşturuldu`);
            navigate(`/musteriler/${tenant.id}`);
          }}
        />
      )}
    </div>
  );
};

export default TenantList;
