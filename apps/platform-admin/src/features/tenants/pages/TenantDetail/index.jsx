import { useState } from "react";
import { Link, useParams } from "react-router";
import { FiEdit2, FiGlobe, FiInfo, FiPlus } from "react-icons/fi";
import Button from "@/components/Button";
import ButtonGroup from "@/components/ButtonGroup";
import Card from "@/components/Card";
import DescriptionList from "@/components/DescriptionList";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import Tabs, { TabPanel } from "@/components/Tabs";
import { toast } from "@/components/Toast/toast";
import { isApiError } from "@/api/errors";
import { usePlatformCan } from "@/auth/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSearchParamsState } from "@/hooks/useSearchParamsState";
import NotFound from "@/pages/NotFound";
import { formatDateTime } from "@/utils/format";
import { availableActions, LIFECYCLE_ACTIONS } from "../../../lifecycle/actions";
import LifecycleModal from "../../../lifecycle/components/LifecycleModal";
import TenantDataLifecycle from "../../components/TenantDataLifecycle";
import StatusBadge from "../../../lifecycle/components/StatusBadge";
import SiteTable from "../../../sites/components/SiteTable";
import { useSites } from "../../../sites/api";
import TenantFormModal from "../../components/TenantFormModal";
import TenantAccount from "../../components/TenantAccount";
import { useTenant, useTenantAction } from "../../api";
import "./tenant_detail.scss";

const TAB_DEFAULTS = { sekme: "genel" };

const IMPACTS = {
  suspend: "Müşterinin bütün siteleri yayından düşer (public API 503 döner) ve müşteri kullanıcıları panelde bu müşterinin sitelerini göremez. Veriler korunur; yeniden etkinleştirince her şey kaldığı yerden devam eder.",
  archive: "Müşteri arşivlenir: siteleri yayından düşer, kullanıcıları erişemez ve kayıt düzenlenemez. Veriler silinmez; gerekirse yeniden etkinleştirilebilir.",
  restore: "Müşteri yeniden aktif olur. Siteler kendi durumlarına göre yayına döner; askıdaki siteler askıda kalır.",
};

const TenantDetail = () => {
  const { tenantId } = useParams();
  const can = usePlatformCan();
  const tenantQuery = useTenant(tenantId);
  const sitesQuery = useSites({ tenantId, page: 1, size: 100 });
  const action = useTenantAction(tenantId);
  const [tab, setTab] = useSearchParamsState(TAB_DEFAULTS);
  const [editOpen, setEditOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const tenant = tenantQuery.data;
  usePageTitle(tenant?.displayName ?? "Müşteri");

  if (tenantQuery.isPending) return <Skeleton variant="rectangle" height={320} radius="lg" />;
  if (isApiError(tenantQuery.error, "NOT_FOUND")) return <NotFound />;
  if (tenantQuery.isError) return <QueryErrorAlert error={tenantQuery.error} onRetry={() => tenantQuery.refetch()} />;

  const canManage = can("platform.tenant.manage");
  const editable = canManage && tenant.status !== "ARCHIVED" && tenant.status !== "PURGED";
  const sites = sitesQuery.data?.items ?? [];
  const canAddSite = can("platform.site.manage") && tenant.status === "ACTIVE" && tenant.siteCount < tenant.quota.maxSites;

  const tabs = [
    { id: "genel", label: "Genel", icon: FiInfo },
    { id: "siteler", label: "Siteler", icon: FiGlobe, badge: tenant.siteCount },
  ];

  const activeTab = tabs.some((item) => item.id === tab.sekme) ? tab.sekme : TAB_DEFAULTS.sekme;
  const addSiteButton = canAddSite && <Button as={Link} to={`/siteler/yeni?musteri=${tenant.id}`} icon={FiPlus}>Site oluştur</Button>;

  return (
    <div className="tenant_detail">
      <PageHeader
        title={tenant.displayName}
        badge={<StatusBadge status={tenant.status} size="md" />}
        breadcrumb={[{ label: "Müşteriler", path: "/musteriler" }, { label: tenant.displayName }]}
        actions={canManage && (
          <ButtonGroup attached={false} ariaLabel="Müşteri işlemleri">
            {editable && <Button variant="outline" icon={FiEdit2} onClick={() => setEditOpen(true)}>Düzenle</Button>}
            {availableActions(tenant.status).map((item) => (
              <Button key={item.key} variant="outline" color={item.color === "primary" ? undefined : item.color} onClick={() => setPendingAction(item.key)}>{item.label}</Button>
            ))}
          </ButtonGroup>
        )}
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setTab({ sekme: id }, { replace: true })} idPrefix="tenant" ariaLabel="Müşteri bölümleri" />

      <TabPanel id="genel" activeTab={activeTab} idPrefix="tenant">
        <Card title="Müşteri bilgileri">
          <DescriptionList
            layout="grid"
            columns={2}
            items={[
              { label: "Müşteri adı", value: tenant.displayName },
              { label: "Durum", value: <StatusBadge status={tenant.status} /> },
              { label: "Site kullanımı", value: `${tenant.siteCount} / ${tenant.quota.maxSites}` },
              { label: "Oluşturma", value: formatDateTime(tenant.createdAt) },
              { label: "Son güncelleme", value: formatDateTime(tenant.updatedAt) },
            ]}
          />
        </Card>
        <TenantAccount tenant={tenant} canManage={canManage} />
        <TenantDataLifecycle tenant={tenant} canManage={canManage} />
      </TabPanel>

      <TabPanel id="siteler" activeTab={activeTab} idPrefix="tenant">
        <div className="tenant_detail_section">
          {sites.length > 0 && <div className="tenant_detail_section_actions">{addSiteButton}</div>}
          {sitesQuery.isPending && <Skeleton variant="rectangle" height={160} radius="lg" />}
          {sitesQuery.isError && <QueryErrorAlert error={sitesQuery.error} onRetry={() => sitesQuery.refetch()} />}
          {sitesQuery.isSuccess && (sites.length > 0
            ? <SiteTable sites={sites} showTenant={false} caption={`${tenant.displayName} siteleri`} />
            : <EmptyState variant="bordered" icon={FiGlobe} title="Henüz site yok" description="Müşteri için ilk web sitesini oluşturun; içerik bölümleri site üzerinden yapılandırılır." action={addSiteButton} />)}
        </div>
      </TabPanel>

      {editOpen && (
        <TenantFormModal
          open
          tenant={tenant}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            toast.success("Müşteri bilgileri kaydedildi");
          }}
        />
      )}
      <LifecycleModal
        key={pendingAction ?? "closed"}
        action={pendingAction}
        subject={tenant.displayName}
        impacts={IMPACTS}
        pending={action.isPending}
        error={action.error}
        onClose={() => {
          setPendingAction(null);
          action.reset();
        }}
        onConfirm={(reason) => action.mutate({ action: pendingAction, reason, version: tenant.version }, {
          onSuccess: () => {
            toast.success(`${tenant.displayName} ${LIFECYCLE_ACTIONS[pendingAction].verb}`);
            setPendingAction(null);
          },
        })}
      />
    </div>
  );
};

export default TenantDetail;
