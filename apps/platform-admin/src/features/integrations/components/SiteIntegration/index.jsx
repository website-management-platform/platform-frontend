import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import { useIntegration } from "../../api";
import AccessSettings from "../AccessSettings";
import CredentialList from "../CredentialList";
import DomainList from "../DomainList";
import ManifestList from "../ManifestList";
import WebhookList from "../WebhookList";
import "./site_integration.scss";

/** Site ayrıntısındaki "Entegrasyon" sekmesi (şartname §16, §25.8). */
const SiteIntegration = ({ site, canManage }) => {
  const query = useIntegration(site.id);
  if (query.isPending) return <Skeleton variant="rectangle" height={320} radius="lg" />;
  if (query.isError) return <QueryErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  const manage = canManage && site.status !== "ARCHIVED";
  return (
    <div className="integration">
      <AccessSettings key={query.data.version} siteId={site.id} access={query.data} canManage={manage} />
      <DomainList siteId={site.id} canManage={manage} />
      <ManifestList siteId={site.id} canManage={manage} />
      <WebhookList siteId={site.id} canManage={manage} />
      <CredentialList siteId={site.id} canManage={manage} />
    </div>
  );
};

export default SiteIntegration;
