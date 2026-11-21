import { FiFileText, FiSearch } from "react-icons/fi";
import Card from "@/components/Card";
import Input from "@/components/Input";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import SegmentedControl from "@/components/SegmentedControl";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUrlListFilters } from "@/hooks/useUrlListFilters";
import ListState from "../../../lifecycle/components/ListState";
import AuditList from "../../components/AuditList";
import { useAuditEvents } from "../../api";
import "./audit_log.scss";

const PAGE_SIZE = 25;
const FILTER_DEFAULTS = { ara: "", alan: "", sayfa: 1 };
const REALM_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "platform", label: "Platform" },
  { value: "customer", label: "Müşteri paneli" },
];

const AuditLog = () => {
  usePageTitle("Denetim kaydı");
  const { filters, search, setSearch, setFilter, page, setPage, clear, filtered } = useUrlListFilters(FILTER_DEFAULTS);
  const auditQuery = useAuditEvents({ q: filters.ara || undefined, realm: filters.alan || undefined, page, size: PAGE_SIZE });

  return (
    <div className="audit_log">
      <PageHeader title="Denetim kaydı" description="Kim, neyi, ne zaman yaptı. Kayıtlar değiştirilemez; gizli değerler kayda yazılmaz." />
      <div className="audit_log_toolbar">
        <Input aria-label="Özet veya kişi e-postasıyla ara" placeholder="Özet veya kişi e-postasıyla ara" type="search" icon={FiSearch} value={search} onChange={(event) => setSearch(event.target.value)} className="audit_log_search" />
        <SegmentedControl options={REALM_OPTIONS} value={filters.alan} onChange={(value) => setFilter("alan", value)} ariaLabel="Kaynağa göre süz" size="sm" />
      </div>
      <ListState
        query={auditQuery}
        filtered={filtered}
        onClearFilters={clear}
        empty={{ icon: FiFileText, title: "Henüz kayıt yok", description: "Giriş, müşteri ve site işlemleri burada listelenir." }}
      >
        <Card>
          <AuditList events={auditQuery.data?.items ?? []} showRequestId />
        </Card>
        <Pagination page={page} pageCount={Math.max(1, Math.ceil((auditQuery.data?.total ?? 0) / PAGE_SIZE))} onChange={setPage} />
      </ListState>
    </div>
  );
};

export default AuditLog;
