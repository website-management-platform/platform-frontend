import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { FiBox, FiPackage, FiPlus } from "react-icons/fi";
import { labelOf } from "@wmp/schema";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ButtonGroup from "@/components/ButtonGroup";
import EmptyState from "@/components/EmptyState";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import Table from "@/components/Table";
import { toast } from "@/components/Toast/toast";
import StatusBadge from "../../../lifecycle/components/StatusBadge";
import { KIND_LABELS } from "../../../schema-designer/labels";
import { useSiteModules } from "../../api";
import ApplyPresetModal from "../ApplyPresetModal";
import AssignModuleModal from "../AssignModuleModal";
import "./site_modules.scss";

/** Sitenin modülleri (şartname §11 site yapılandırma → modüller). */
const SiteModules = ({ site, canManage }) => {
  const navigate = useNavigate();
  const query = useSiteModules(site.id);
  const [dialog, setDialog] = useState(null);
  const editable = canManage && site.status !== "ARCHIVED";

  if (query.isPending) return <Skeleton variant="rectangle" height={240} radius="lg" />;
  if (query.isError) return <QueryErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  const modules = query.data.items;
  const existingKeys = modules.map((item) => item.key);
  const actions = editable && (
    <ButtonGroup attached={false} ariaLabel="Bölüm ekleme">
      <Button icon={FiPlus} onClick={() => setDialog("assign")}>Bölüm ekle</Button>
      <Button variant="outline" icon={FiPackage} onClick={() => setDialog("preset")}>Site şablonundan ekle</Button>
    </ButtonGroup>
  );

  return (
    <div className="site_modules">
      {modules.length === 0 ? (
        <EmptyState variant="bordered" icon={FiBox} title="Bu sitede bölüm yok" description="Bölüm şablonundan ekleyin veya bir site şablonunun bölümlerini seçin." action={actions} />
      ) : (
        <>
          <div className="site_modules_head">
            <p className="site_modules_note">Müşteri yalnız açık ve yayınlanmış bölümleri görür. Yapı değişiklikleri bölüm sayfasında taslak olarak hazırlanır.</p>
            {actions}
          </div>
          <Table variant="bordered" hoverable caption="Site bölümleri" hideCaption className="site_modules_table">
            <thead>
              <tr>
                <th scope="col">Bölüm</th>
                <th scope="col">Tür</th>
                <th scope="col">Şablon</th>
                <th scope="col">Yapı sürümü</th>
                <th scope="col" className="site_modules_number">Kayıt</th>
                <th scope="col">Durum</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link to={`/siteler/${site.id}/moduller/${item.id}`} className="site_modules_name">{labelOf(item.label)}</Link>
                    <code className="site_modules_key">{item.key}</code>
                  </td>
                  <td>{KIND_LABELS[item.kind] ?? "—"}</td>
                  <td>
                    {item.template ? <Link to={`/moduller/${item.template.id}`}>{labelOf(item.template.label)}</Link> : "—"}
                    {item.template && <span className="site_modules_meta">v{item.template.version}{item.template.latestVersion > item.template.version && <Badge size="sm" variant="info">v{item.template.latestVersion} var</Badge>}</span>}
                  </td>
                  <td>v{item.activeVersion}{item.hasDraft && <> <Badge size="sm" variant="warning">Taslak</Badge></>}</td>
                  <td className="site_modules_number">{item.entryCount}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
      {dialog === "assign" && (
        <AssignModuleModal
          site={site}
          existingKeys={existingKeys}
          onClose={() => setDialog(null)}
          onSaved={(instance) => {
            setDialog(null);
            toast.success(`${labelOf(instance.label)} eklendi`);
            navigate(`/siteler/${site.id}/moduller/${instance.id}`);
          }}
        />
      )}
      {dialog === "preset" && (
        <ApplyPresetModal
          site={site}
          existingKeys={existingKeys}
          onClose={() => setDialog(null)}
          onSaved={(result) => {
            setDialog(null);
            toast.success(`${result.items.length} bölüm eklendi`);
          }}
        />
      )}
    </div>
  );
};

export default SiteModules;
