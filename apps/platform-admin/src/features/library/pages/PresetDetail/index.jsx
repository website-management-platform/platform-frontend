import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { FiArchive, FiCopy, FiEdit2, FiEdit3, FiRotateCcw } from "react-icons/fi";
import { labelOf } from "@wmp/schema";
import Alert from "@/components/Alert";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ButtonGroup from "@/components/ButtonGroup";
import Card from "@/components/Card";
import PageHeader from "@/components/PageHeader";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import Table from "@/components/Table";
import Textarea from "@/components/Textarea";
import Timeline from "@/components/Timeline";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage, getFieldErrors, isApiError } from "@/api/errors";
import { usePlatformCan } from "@/auth/api";
import { useConfirm } from "@/hooks/useConfirm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import NotFound from "@/pages/NotFound";
import { formatDateTime } from "@/utils/format";
import { KIND_LABELS } from "../../../schema-designer/labels";
import CloneModal from "../../components/CloneModal";
import PresetInfoModal from "../../components/PresetInfoModal";
import PresetModulesEditor from "../../components/PresetModulesEditor";
import { useCreatePresetVersion, usePreset, usePresetAction } from "../../api";
import "../../library.scss";
import "./preset_detail.scss";

const toEditable = (modules) => modules.map(({ templateId, templateVersion, key, label, templateLabel }) => ({ templateId, templateVersion, key, label, templateLabel }));

// Yeni sürüm düzenleyicisi: modül listesi değişir, kaydedilince yeni değişmez sürüm oluşur.
const PresetVersionEditor = ({ preset, onDone }) => {
  const [modules, setModules] = useState(() => toEditable(preset.modules));
  const [changelog, setChangelog] = useState("");
  const createVersion = useCreatePresetVersion(preset.id);
  useUnsavedChangesGuard(!createVersion.isSuccess);
  const fieldErrors = getFieldErrors(createVersion.error);
  const generalError = createVersion.error && Object.keys(fieldErrors).filter((key) => key.startsWith("modules")).length === 0 ? getErrorMessage(createVersion.error) : null;
  return (
    <Card title={`${preset.latestVersion + 1}. sürüm`} description="Bu site şablonuyla daha önce kurulmuş siteler değişmez.">
      <div className="library_stack">
        {generalError && <Alert variant="danger" size="compact">{generalError}</Alert>}
        <PresetModulesEditor modules={modules} onChange={setModules} errors={fieldErrors} />
        <Textarea label="Değişiklik notu" optionalText="İsteğe bağlı" rows={2} maxLength={500} value={changelog} onChange={(event) => setChangelog(event.target.value)} />
        <div className="preset_detail_actions">
          <Button variant="outline" onClick={() => onDone(null)} disabled={createVersion.isPending}>Vazgeç</Button>
          <Button
            loading={createVersion.isPending}
            onClick={() => createVersion.mutate({ modules: modules.map(({ templateLabel: _templateLabel, ...item }) => item), changelog, version: preset.version }, { onSuccess: onDone })}
          >
            Sürümü yayınla
          </Button>
        </div>
      </div>
    </Card>
  );
};

/** Preset detayı: güncel modüller, yeni sürüm, sürüm geçmişi. */
const PresetDetail = () => {
  const { presetId } = useParams();
  const navigate = useNavigate();
  const can = usePlatformCan();
  const confirm = useConfirm();
  const presetQuery = usePreset(presetId);
  const action = usePresetAction(presetId);
  const [editing, setEditing] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const preset = presetQuery.data;
  usePageTitle(preset ? labelOf(preset.label) : "Site şablonu");

  if (presetQuery.isPending) return <Skeleton variant="rectangle" height={320} radius="lg" />;
  if (isApiError(presetQuery.error, "NOT_FOUND")) return <NotFound />;
  if (presetQuery.isError) return <QueryErrorAlert error={presetQuery.error} onRetry={() => presetQuery.refetch()} />;

  const canManage = can("platform.library.manage");
  const active = preset.status === "ACTIVE";
  const toggleArchive = async () => {
    const ok = await confirm({
      variant: active ? "warning" : "default",
      title: active ? `${labelOf(preset.label)} arşivlensin mi?` : `${labelOf(preset.label)} arşivden çıkarılsın mı?`,
      description: active ? "Arşivli site şablonu site oluşturmada önerilmez. Bu site şablonuyla kurulmuş siteler etkilenmez." : "Site şablonu yeniden site oluşturmada önerilir.",
      confirmLabel: active ? "Arşivle" : "Arşivden çıkar",
      onConfirm: () => action.mutateAsync({ action: active ? "archive" : "restore", version: preset.version }),
    });
    if (ok) toast.success(active ? "Site şablonu arşivlendi" : "Site şablonu arşivden çıkarıldı");
  };

  return (
    <div className="preset_detail">
      <PageHeader
        title={labelOf(preset.label)}
        description={preset.description || preset.family}
        badge={<span className="preset_detail_badges"><Badge variant="neutral">{preset.family}</Badge><Badge variant="accent">v{preset.latestVersion}</Badge>{!active && <Badge variant="neutral">Arşivde</Badge>}</span>}
        breadcrumb={[{ label: "Site şablonları", path: "/presetler" }, { label: labelOf(preset.label) }]}
        actions={canManage && (
          <ButtonGroup attached={false} ariaLabel="Şablon işlemleri">
            {active && !editing && <Button icon={FiEdit2} onClick={() => setEditing(true)}>Yeni sürüm</Button>}
            {active && <Button variant="outline" icon={FiEdit3} onClick={() => setInfoOpen(true)}>Bilgileri düzenle</Button>}
            <Button variant="outline" icon={FiCopy} onClick={() => setCloneOpen(true)}>Kopyala</Button>
            <Button variant="outline" icon={active ? FiArchive : FiRotateCcw} onClick={toggleArchive}>{active ? "Arşivle" : "Arşivden çıkar"}</Button>
          </ButtonGroup>
        )}
      />
      {editing ? (
        <PresetVersionEditor
          key={preset.version}
          preset={preset}
          onDone={(next) => {
            setEditing(false);
            if (next) toast.success(`${labelOf(next.label)} v${next.latestVersion} yayınlandı`);
          }}
        />
      ) : (
        <Card title="Bölümler" description={`v${preset.latestVersion} · site oluşturulurken bu bölümler önerilir; kullanıcı istediğini çıkarabilir.`}>
          <Table variant="bordered" caption="Şablondaki bölümler" hideCaption>
            <thead>
              <tr>
                <th scope="col">Bölüm</th>
                <th scope="col">Şablon</th>
                <th scope="col">Tür</th>
              </tr>
            </thead>
            <tbody>
              {preset.modules.map((item) => (
                <tr key={item.key}>
                  <td>{labelOf(item.label)} <code className="library_code">{item.key}</code></td>
                  <td><Link to={`/moduller/${item.templateId}`}>{item.templateLabel}</Link> <span className="library_muted">v{item.templateVersion}</span>{item.templateStatus === "ARCHIVED" && <Badge size="sm" variant="warning">Şablon arşivde</Badge>}</td>
                  <td>{KIND_LABELS[item.kind] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      <Card title="Sürüm geçmişi">
        <Timeline
          items={preset.versions.map((version) => ({
            id: version.id,
            title: `v${version.version} · ${version.modules.length} bölüm`,
            description: version.changelog ?? "Not yok",
            time: `${formatDateTime(version.createdAt)} · ${version.createdBy?.displayName ?? ""}`,
          }))}
        />
      </Card>
      {infoOpen && <PresetInfoModal preset={preset} onClose={() => setInfoOpen(false)} onSaved={() => { setInfoOpen(false); toast.success("Site şablonu güncellendi"); }} />}
      {cloneOpen && (
        <CloneModal
          title="Site şablonunu kopyala"
          description="Kopya, güncel sürümün bölüm listesiyle 1. sürüm olarak oluşur."
          sourceKey={preset.key}
          sourceLabel={labelOf(preset.label)}
          pending={action.isPending}
          error={action.error}
          onClose={() => {
            setCloneOpen(false);
            action.reset();
          }}
          onSubmit={(values, idempotencyKey) => action.mutate({ action: "clone", values, idempotencyKey }, {
            onSuccess: (copy) => {
              setCloneOpen(false);
              toast.success(`${labelOf(copy.label)} oluşturuldu`);
              navigate(`/presetler/${copy.id}`);
            },
          })}
        />
      )}
    </div>
  );
};

export default PresetDetail;
