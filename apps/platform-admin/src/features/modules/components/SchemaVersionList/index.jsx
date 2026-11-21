import { FiRotateCcw } from "react-icons/fi";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import Table from "@/components/Table";
import { formatDateTime } from "@/utils/format";
import { IMPACT_META } from "../../../schema-designer/labels";
import { useSchemaVersions } from "../../api";
import { SOURCE_LABELS } from "../../labels";

/** Modül şemasının yayınlanmış sürümleri; eski sürüme dönüş taslak olarak hazırlanır (şartname §6.2). */
const SchemaVersionList = ({ siteId, instanceId, activeVersion, canRollback, onRollback }) => {
  const query = useSchemaVersions(siteId, instanceId);
  if (query.isPending) return <Skeleton variant="rectangle" height={200} radius="lg" />;
  if (query.isError) return <QueryErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  return (
    <Table variant="bordered" caption="Yapı sürümleri" hideCaption>
      <thead>
        <tr>
          <th scope="col">Sürüm</th>
          <th scope="col">Kaynak</th>
          <th scope="col">Not</th>
          <th scope="col">Etki</th>
          <th scope="col">Yayınlayan</th>
          <th scope="col"><span className="template_versions_sr">İşlem</span></th>
        </tr>
      </thead>
      <tbody>
        {query.data.items.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>v{item.version}</strong>{" "}
              {item.version === activeVersion ? <Badge size="sm" variant="success">Yayında</Badge> : <Badge size="sm" variant="neutral">Önceki</Badge>}
            </td>
            <td>{SOURCE_LABELS[item.source?.type] ?? "—"}{item.source?.type === "rollback" ? ` (v${item.source.toVersion})` : ""}</td>
            <td>{item.changelog ?? "—"}</td>
            <td>
              {item.summary ? (
                <span>
                  <Badge size="sm" variant={IMPACT_META[item.summary.impact]?.variant ?? "neutral"}>{IMPACT_META[item.summary.impact]?.label ?? "—"}</Badge>{" "}
                  {item.summary.changes} değişiklik · {item.summary.changedEntries} kayıt dönüştü
                </span>
              ) : "—"}
            </td>
            <td>{item.publishedBy?.displayName ?? "—"}<span className="template_versions_meta">{formatDateTime(item.publishedAt)}</span></td>
            <td className="template_versions_end">
              {canRollback && item.version < activeVersion && (
                <Button variant="outline" size="sm" icon={FiRotateCcw} onClick={() => onRollback(item.version)}>Bu sürüme dön</Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default SchemaVersionList;
