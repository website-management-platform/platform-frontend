import { Link } from "react-router";
import { FiGlobe, FiPlus } from "react-icons/fi";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import { usePlatformCan } from "@/auth/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUrlListFilters } from "@/hooks/useUrlListFilters";
import ListState from "../../../lifecycle/components/ListState";
import ListToolbar from "../../../lifecycle/components/ListToolbar";
import SiteTable from "../../components/SiteTable";
import { useSites } from "../../api";
import "./site_list.scss";

const PAGE_SIZE = 20;
const FILTER_DEFAULTS = { ara: "", durum: "", sayfa: 1 };

const SiteList = () => {
  usePageTitle("Web siteleri");
  const can = usePlatformCan();
  const { filters, search, setSearch, setFilter, page, setPage, clear, filtered } = useUrlListFilters(FILTER_DEFAULTS);
  const sitesQuery = useSites({ q: filters.ara || undefined, status: filters.durum || undefined, page, size: PAGE_SIZE });
  const createButton = can("platform.site.manage") && <Button as={Link} to="/siteler/yeni" icon={FiPlus}>Site oluştur</Button>;

  return (
    <div className="site_list">
      <PageHeader title="Web siteleri" description="Bütün müşterilerin siteleri. Site oluştururken müşteri seçilir." actions={createButton} />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchLabel="Site adı, anahtar veya alan adıyla ara"
        status={filters.durum}
        onStatusChange={(value) => setFilter("durum", value)}
      />
      <ListState
        query={sitesQuery}
        filtered={filtered}
        onClearFilters={clear}
        empty={{ icon: FiGlobe, title: "Henüz site yok", description: "Bir müşteri için ilk web sitesini oluşturun.", action: createButton }}
      >
        <SiteTable sites={sitesQuery.data?.items ?? []} />
        <Pagination page={page} pageCount={Math.max(1, Math.ceil((sitesQuery.data?.total ?? 0) / PAGE_SIZE))} onChange={setPage} />
      </ListState>
    </div>
  );
};

export default SiteList;
