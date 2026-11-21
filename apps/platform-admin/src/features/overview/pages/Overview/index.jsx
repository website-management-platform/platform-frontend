import { Link } from "react-router";
import { FiBriefcase, FiFileText, FiGlobe, FiMail, FiPlus, FiUsers } from "react-icons/fi";
import Button from "@/components/Button";
import Card from "@/components/Card";
import PageHeader from "@/components/PageHeader";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import { useCurrentUser, usePlatformCan } from "@/auth/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import AuditList from "../../../audit/components/AuditList";
import { useOverview } from "../../api";
import "./overview.scss";

const StatusSummary = ({ counts }) => (
  <span className="overview_stat_breakdown">
    {counts.active} aktif · {counts.suspended} askıda · {counts.archived} arşivde
  </span>
);

const StatCard = ({ icon: Icon, label, value, detail, to }) => (
  <Card className="overview_stat">
    <div className="overview_stat_row">
      <span className="overview_stat_icon" aria-hidden="true"><Icon /></span>
      <div className="overview_stat_text">
        <span className="overview_stat_label">{to ? <Link to={to}>{label}</Link> : label}</span>
        <span className="overview_stat_value">{value}</span>
        {detail}
      </div>
    </div>
  </Card>
);

const Overview = () => {
  usePageTitle("Genel bakış");
  const user = useCurrentUser();
  const can = usePlatformCan();
  const overviewQuery = useOverview();
  const data = overviewQuery.data;

  return (
    <div className="overview">
      <PageHeader
        title="Genel bakış"
        description={`Hoş geldiniz, ${user.displayName}.`}
        actions={(
          <>
            {can("platform.tenant.manage") && <Button variant="outline" as={Link} to="/musteriler?yeni=1" icon={FiPlus}>Yeni müşteri</Button>}
            {can("platform.site.manage") && <Button as={Link} to="/siteler/yeni" icon={FiPlus}>Site oluştur</Button>}
          </>
        )}
      />
      {overviewQuery.isError && <QueryErrorAlert error={overviewQuery.error} onRetry={() => overviewQuery.refetch()} />}
      {overviewQuery.isPending && <Skeleton variant="rectangle" height={140} radius="lg" />}
      {data && (
        <>
          <div className="overview_stats">
            <StatCard icon={FiBriefcase} label="Müşteriler" value={data.tenants.total} detail={<StatusSummary counts={data.tenants} />} to="/musteriler" />
            <StatCard icon={FiGlobe} label="Web siteleri" value={data.sites.total} detail={<StatusSummary counts={data.sites} />} to="/siteler" />
            <StatCard icon={FiUsers} label="Müşteri hesapları" value={data.customerUsers} detail={<span className="overview_stat_breakdown">Her müşterinin tek hesabı</span>} />
            <StatCard icon={FiMail} label="Şifre bekleyen hesaplar" value={data.pendingAccounts} detail={<span className="overview_stat_breakdown">Kurulum bağlantısı gönderildi</span>} />
          </div>
          {data.recentAudit && (
            <Card
              title="Son işlemler"
              icon={FiFileText}
              actions={<Button variant="ghost" size="sm" as={Link} to="/denetim">Tümünü gör</Button>}
            >
              {data.recentAudit.length > 0
                ? <AuditList events={data.recentAudit} />
                : <p className="overview_empty">Henüz işlem kaydı yok.</p>}
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Overview;
