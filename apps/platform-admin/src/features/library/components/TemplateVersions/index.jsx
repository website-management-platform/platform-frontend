import { Fragment, useState } from "react";
import { getFieldType, labelOf } from "@wmp/schema";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import Table from "@/components/Table";
import { formatDateTime } from "@/utils/format";
import { KIND_LABELS } from "../../../schema-designer/labels";
import { useTemplateVersion, useTemplateVersions } from "../../api";
import "./template_versions.scss";
import "./template_versions.scss";

const VersionFields = ({ templateId, version }) => {
  const query = useTemplateVersion(templateId, version);
  if (query.isPending) return <Skeleton variant="rectangle" height={80} />;
  if (query.isError) return <QueryErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  return (
    <ul className="template_versions_fields">
      {query.data.schema.fields.map((field) => (
        <li key={field.id}>
          <strong>{labelOf(field.label)}</strong> <code>{field.key}</code> · {getFieldType(field.type)?.label ?? field.type}
          {field.required ? " · zorunlu" : ""}{field.archived ? " · arşivde" : ""}
        </li>
      ))}
    </ul>
  );
};

/** Şablonun değişmez sürümleri. */
const TemplateVersions = ({ templateId }) => {
  const query = useTemplateVersions(templateId);
  const [open, setOpen] = useState(null);
  if (query.isPending) return <Skeleton variant="rectangle" height={160} radius="lg" />;
  if (query.isError) return <QueryErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.items.length === 0) return <EmptyState variant="bordered" title="Henüz yayınlanmış sürüm yok" description="Taslağı tasarlayıp ilk sürümü yayınladığınızda şablon sitelere eklenebilir." />;
  return (
    <Table variant="bordered" caption="Şablon sürümleri" hideCaption>
      <thead>
        <tr>
          <th scope="col">Sürüm</th>
          <th scope="col">Not</th>
          <th scope="col">Tür</th>
          <th scope="col">Yayınlayan</th>
          <th scope="col"><span className="template_versions_sr">Alanlar</span></th>
        </tr>
      </thead>
      <tbody>
        {query.data.items.map((item) => (
          <Fragment key={item.id}>
            <tr>
              <td><strong>v{item.version}</strong><span className="template_versions_meta">{formatDateTime(item.createdAt)}</span></td>
              <td>{item.changelog ?? "—"}</td>
              <td>{KIND_LABELS[item.kind]} · {item.fieldCount} alan</td>
              <td>{item.createdBy?.displayName ?? "—"}</td>
              <td className="template_versions_end">
                <Button variant="link" size="sm" aria-expanded={open === item.version} onClick={() => setOpen(open === item.version ? null : item.version)}>{open === item.version ? "Gizle" : "Alanları gör"}</Button>
              </td>
            </tr>
            {open === item.version && (
              <tr>
                <td colSpan={5}><VersionFields templateId={templateId} version={item.version} /></td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </Table>
  );
};

export default TemplateVersions;
