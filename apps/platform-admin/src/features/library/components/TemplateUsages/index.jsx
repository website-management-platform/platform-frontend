import { Link } from "react-router";
import { labelOf } from "@wmp/schema";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import Table from "@/components/Table";
import StatusBadge from "../../../lifecycle/components/StatusBadge";
import { useTemplateUsages } from "../../api";
import "../../library.scss";

/** Şablonu kullanan site modülleri ve presetler (bağımlılık görünümü; şartname §11). */
const TemplateUsages = ({ templateId, latestVersion }) => {
  const query = useTemplateUsages(templateId);
  if (query.isPending) return <Skeleton variant="rectangle" height={160} radius="lg" />;
  if (query.isError) return <QueryErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  const { items, presets } = query.data;
  return (
    <div className="library_stack">
      {presets.length > 0 && (
        <p className="library_muted">Presetler: {presets.map((preset) => <Link key={preset.id} to={`/presetler/${preset.id}`} className="library_inline_link">{labelOf(preset.label)}</Link>)}</p>
      )}
      {items.length === 0 ? (
        <EmptyState variant="bordered" title="Hiçbir sitede kullanılmıyor" description="Şablon bir siteye bölüm olarak eklenince burada görünür." />
      ) : (
        <Table variant="bordered" caption="Şablonu kullanan site bölümleri" hideCaption>
          <thead>
            <tr>
              <th scope="col">Site</th>
              <th scope="col">Bölüm</th>
              <th scope="col">Sürüm</th>
              <th scope="col">Durum</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.instanceId}>
                <td><Link to={`/siteler/${item.site.id}`}>{item.site.displayName}</Link><span className="library_muted library_block">{item.site.tenantName}</span></td>
                <td><Link to={`/siteler/${item.site.id}/moduller/${item.instanceId}`}>{labelOf(item.label)}</Link> <code className="library_code">{item.key}</code></td>
                <td>v{item.templateVersion} {item.templateVersion < latestVersion && <Badge size="sm" variant="info">Güncelleme var</Badge>}</td>
                <td><StatusBadge status={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default TemplateUsages;
