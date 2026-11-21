import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { FiArchive, FiArrowUpCircle, FiCopy, FiEdit2, FiPower, FiRotateCcw, FiTrash2, FiUploadCloud } from "react-icons/fi";
import { diffSchemas, labelOf } from "@wmp/schema";
import Alert from "@/components/Alert";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ButtonGroup from "@/components/ButtonGroup";
import CopyButton from "@/components/CopyButton";
import PageHeader from "@/components/PageHeader";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import Tabs, { TabPanel } from "@/components/Tabs";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage, isApiError } from "@/api/errors";
import { usePlatformCan } from "@/auth/api";
import { useConfirm } from "@/hooks/useConfirm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSearchParamsState } from "@/hooks/useSearchParamsState";
import NotFound from "@/pages/NotFound";
import { useFieldGroups, useFieldTypes } from "../../../library/api";
import LifecycleModal from "../../../lifecycle/components/LifecycleModal";
import StatusBadge from "../../../lifecycle/components/StatusBadge";
import AutosaveStatus from "../../../schema-designer/components/AutosaveStatus";
import SchemaDesigner from "../../../schema-designer/components/SchemaDesigner";
import { useDraftAutosave } from "../../../schema-designer/hooks/useDraftAutosave";
import { KIND_LABELS } from "../../../schema-designer/labels";
import { useSite } from "../../../sites/api";
import CloneModal from "../../../library/components/CloneModal";
import PublishSchemaDrawer from "../../components/PublishSchemaDrawer";
import RenameModuleModal from "../../components/RenameModuleModal";
import SchemaVersionList from "../../components/SchemaVersionList";
import { useModuleAction, useRollbackSchema, useSiteModule, useSiteModules, useUpdateModule } from "../../api";
import { MODULE_IMPACTS } from "../../labels";
import "./module_detail.scss";

const TAB_DEFAULTS = { sekme: "tasarim" };

const LIFECYCLE = {
  enable: { label: "Müşteriye aç", verb: "açıldı", reasonRequired: false, color: "primary" },
  disable: { label: "Kapat", verb: "kapatıldı", reasonRequired: false, color: "warning" },
  archive: { label: "Arşivle", verb: "arşivlendi", reasonRequired: true, color: "danger" },
  restore: { label: "Arşivden çıkar", verb: "arşivden çıkarıldı", reasonRequired: false, color: "primary" },
};

const DRAFT_SOURCE_TEXT = {
  rollback: (source) => `Bu taslak v${source.toVersion} yapısından hazırlandı. Sonradan eklenen alanlar silinmedi, arşivli olarak korunuyor. İnceleyip yayınlayın veya taslağı atın.`,
  upgrade: (source) => `Bu taslak şablonun v${source.toTemplateVersion} sürümünden hazırlandı. Bölüme özel alanlar korundu; şablondan kalkan alanlar arşivlendi.`,
};

// Modül çalışma alanı: taslak, otomatik kayıt ve modül işlemleri aynı sürüm (ETag) bilgisini paylaşır.
const ModuleWorkspace = ({ site, instance, refetch }) => {
  const navigate = useNavigate();
  const can = usePlatformCan();
  const confirm = useConfirm();
  const [tab, setTab] = useSearchParamsState(TAB_DEFAULTS);
  const fieldTypesQuery = useFieldTypes();
  const fieldGroupsQuery = useFieldGroups({ status: "ACTIVE" });
  const modulesQuery = useSiteModules(site.id);
  const update = useUpdateModule(site.id, instance.id);
  const rename = useUpdateModule(site.id, instance.id);
  const action = useModuleAction(site.id, instance.id);
  const rollback = useRollbackSchema(site.id, instance.id);
  const editable = can("platform.site.manage") && site.status !== "ARCHIVED" && instance.status !== "ARCHIVED";
  const canManage = can("platform.site.manage") && site.status !== "ARCHIVED";
  const autosave = useDraftAutosave({
    serverDraft: instance.draft,
    serverVersion: instance.version,
    enabled: editable,
    save: (draft, version) => update.mutateAsync({ values: { draft }, version }),
  });
  const [dialog, setDialog] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const getVersion = () => autosave.version.current;
  // Modül işlemi sürümü artırır; kaydedilmiş taslak sunucudakiyle aynıysa yeni sürüm otomatik kayda aktarılır.
  const adopt = (next) => {
    if (autosave.status === "saved") autosave.reset(next.draft, next.version);
  };

  const pending = diffSchemas(instance.activeSchema, autosave.draft).hasChanges;
  const moduleKeys = (modulesQuery.data?.items ?? []).filter((item) => item.status !== "ARCHIVED").map((item) => item.key);
  const tabs = [{ id: "tasarim", label: "Tasarım" }, { id: "surumler", label: "Sürümler", badge: instance.activeVersion }];
  const activeTab = tabs.some((item) => item.id === tab.sekme) ? tab.sekme : TAB_DEFAULTS.sekme;
  const upgradeAvailable = instance.template && instance.template.latestVersion > instance.template.version && instance.template.status === "ACTIVE";
  const lifecycleKeys = { ENABLED: ["disable", "archive"], DISABLED: ["enable", "archive"], ARCHIVED: ["restore"] }[instance.status] ?? [];

  const runAction = (key, reason) => action.mutate({ action: key, values: reason ? { reason } : {}, version: getVersion() }, {
    onSuccess: (next) => {
      adopt(next);
      setPendingAction(null);
      toast.success(`${labelOf(next.label)} ${LIFECYCLE[key].verb}`);
    },
  });

  const discardDraft = async () => {
    const ok = await confirm({
      variant: "destructive",
      title: "Taslak atılsın mı?",
      description: "Yayınlanmamış bütün yapı değişiklikleri silinir; yayındaki sürüm aynen kalır.",
      confirmLabel: "Taslağı at",
      onConfirm: async () => {
        const next = await action.mutateAsync({ action: "discard-draft", version: getVersion() });
        autosave.reset(next.draft, next.version);
      },
    });
    if (ok) toast.success("Taslak atıldı");
  };

  const upgrade = async () => {
    const ok = await confirm({
      title: `Şablonun v${instance.template.latestVersion} sürümü taslağa alınsın mı?`,
      description: "Şablondaki alan tanımları taslağa gelir; bölüme özel alanlar korunur, şablondan kalkan alanlar arşivlenir. Yayından önce fark ve kayıt denetimi gösterilir.",
      confirmLabel: "Taslağa al",
      onConfirm: async () => {
        const next = await action.mutateAsync({ action: "upgrade", values: { templateVersion: instance.template.latestVersion }, version: getVersion() });
        autosave.reset(next.draft, next.version);
      },
    });
    if (ok) {
      setTab({ sekme: "tasarim" }, { replace: true });
      toast.success("Yükseltme taslağı hazırlandı");
    }
  };

  const startRollback = async (toVersion) => {
    const ok = await confirm({
      title: `v${toVersion} yapısına dönüş taslağı hazırlansın mı?`,
      description: "Taslak v" + toVersion + " yapısından oluşur; sonradan eklenen alanlar silinmez, arşivlenir. Yayın yine fark ve kayıt denetiminden geçer.",
      confirmLabel: "Taslak hazırla",
      onConfirm: async () => {
        const next = await rollback.mutateAsync({ toVersion, version: getVersion() });
        autosave.reset(next.draft, next.version);
      },
    });
    if (ok) {
      setTab({ sekme: "tasarim" }, { replace: true });
      toast.success("Dönüş taslağı hazırlandı");
    }
  };

  if (fieldTypesQuery.isPending) return <Skeleton variant="rectangle" height={400} radius="lg" />;
  if (fieldTypesQuery.isError) return <QueryErrorAlert error={fieldTypesQuery.error} onRetry={() => fieldTypesQuery.refetch()} />;

  const toolbar = editable && (
    <div className="module_detail_toolbar">
      <AutosaveStatus
        status={autosave.status}
        error={autosave.error}
        onRetry={autosave.saveNow}
        onReload={async () => {
          const { data } = await refetch();
          if (data) autosave.reset(data.draft, data.version);
        }}
      />
      <div className="module_detail_toolbar_actions">
        {(pending || instance.hasDraft) && <Button variant="outline" color="danger" icon={FiTrash2} onClick={discardDraft} disabled={autosave.status === "saving"}>Taslağı at</Button>}
        <Button icon={FiUploadCloud} disabled={!pending || autosave.status !== "saved"} onClick={() => setDialog("publish")}>İncele ve yayınla</Button>
      </div>
    </div>
  );

  return (
    <div className="module_detail">
      <PageHeader
        title={labelOf(instance.label)}
        description={<>Site: <Link to={`/siteler/${site.id}?sekme=moduller`}>{site.displayName}</Link> · Anahtar: <code>{instance.key}</code> <CopyButton value={instance.key} label="Anahtarı kopyala" size="sm" /></>}
        badge={(
          <span className="module_detail_badges">
            <StatusBadge status={instance.status} size="md" />
            <Badge variant="neutral">{KIND_LABELS[instance.kind]}</Badge>
            <Badge variant="accent">Şema v{instance.activeVersion}</Badge>
          </span>
        )}
        breadcrumb={[{ label: "Web siteleri", path: "/siteler" }, { label: site.displayName, path: `/siteler/${site.id}?sekme=moduller` }, { label: labelOf(instance.label) }]}
        actions={canManage && (
          <ButtonGroup attached={false} ariaLabel="Bölüm işlemleri">
            {instance.status !== "ARCHIVED" && <Button variant="outline" icon={FiEdit2} onClick={() => setDialog("rename")}>Adını değiştir</Button>}
            <Button variant="outline" icon={FiCopy} onClick={() => setDialog("clone")}>Kopyala</Button>
            {lifecycleKeys.map((key) => (
              <Button key={key} variant="outline" color={key === "archive" ? "danger" : undefined} icon={key === "archive" ? FiArchive : key === "restore" ? FiRotateCcw : FiPower} onClick={() => setPendingAction(key)}>{LIFECYCLE[key].label}</Button>
            ))}
          </ButtonGroup>
        )}
      />

      {instance.template && (
        <p className="module_detail_template">
          Şablon: <Link to={`/moduller/${instance.template.id}`}>{labelOf(instance.template.label)}</Link> v{instance.template.version}
          {upgradeAvailable && (
            <>
              {" · "}<Badge size="sm" variant="info">v{instance.template.latestVersion} yayında</Badge>
              {editable && <Button variant="link" size="sm" icon={FiArrowUpCircle} onClick={upgrade}>Yeni sürümü taslağa al</Button>}
            </>
          )}
        </p>
      )}
      {instance.status === "DISABLED" && <Alert variant="warning" size="compact">Bölüm kapalı; müşteri panelinde ve yayın API'sinde görünmez.</Alert>}
      {instance.draftSource && DRAFT_SOURCE_TEXT[instance.draftSource.type] && <Alert variant="info" size="compact">{DRAFT_SOURCE_TEXT[instance.draftSource.type](instance.draftSource)}</Alert>}
      {action.isError && !pendingAction && dialog !== "clone" && <Alert variant="danger" size="compact">{getErrorMessage(action.error)}</Alert>}

      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setTab({ sekme: id }, { replace: true })} idPrefix="module" ariaLabel="Bölüm sekmeleri" />
      <TabPanel id="tasarim" activeTab={activeTab} idPrefix="module">
        <SchemaDesigner
          schema={autosave.draft}
          onChange={autosave.change}
          baseSchema={instance.activeSchema}
          locales={site.locales}
          defaultLocale={site.defaultLocale}
          moduleKeys={moduleKeys}
          fieldTypes={fieldTypesQuery.data.items}
          families={fieldTypesQuery.data.families}
          fieldGroups={fieldGroupsQuery.data?.items ?? []}
          readOnly={!editable}
          excludeTemplateId={null}
          toolbar={toolbar}
        />
      </TabPanel>
      <TabPanel id="surumler" activeTab={activeTab} idPrefix="module">
        <SchemaVersionList siteId={site.id} instanceId={instance.id} activeVersion={instance.activeVersion} canRollback={editable} onRollback={startRollback} />
      </TabPanel>

      {dialog === "publish" && (
        <PublishSchemaDrawer
          siteId={site.id}
          instance={instance}
          draft={autosave.draft}
          locales={site.locales}
          getVersion={getVersion}
          onClose={() => setDialog(null)}
          onPublished={(next) => {
            setDialog(null);
            autosave.reset(next.draft, next.version);
            toast.success(`${labelOf(next.label)} yapısı v${next.activeVersion} olarak yayınlandı`);
          }}
        />
      )}
      {dialog === "rename" && (
        <RenameModuleModal
          instance={instance}
          locales={site.locales}
          mutation={rename}
          getVersion={getVersion}
          onClose={() => {
            setDialog(null);
            rename.reset();
          }}
          onSaved={(next) => {
            setDialog(null);
            adopt(next);
            toast.success("Bölüm adı güncellendi");
          }}
        />
      )}
      {dialog === "clone" && (
        <CloneModal
          title="Bölümü kopyala"
          description="Kopya, yayındaki yapıyı yeni alan kimlikleriyle alır; kayıtlar kopyalanmaz. Kopya kapalı başlar."
          sourceKey={instance.key}
          sourceLabel={labelOf(instance.label)}
          keyHint="Sitede benzersiz; sonradan değiştirilemez."
          pending={action.isPending}
          error={action.error}
          onClose={() => {
            setDialog(null);
            action.reset();
          }}
          onSubmit={(values, idempotencyKey) => action.mutate({ action: "clone", values, idempotencyKey }, {
            onSuccess: (copy) => {
              setDialog(null);
              toast.success(`${labelOf(copy.label)} oluşturuldu`);
              navigate(`/siteler/${site.id}/moduller/${copy.id}`);
            },
          })}
        />
      )}
      <LifecycleModal
        key={pendingAction ?? "closed"}
        action={pendingAction}
        actions={LIFECYCLE}
        subject={labelOf(instance.label)}
        impacts={MODULE_IMPACTS}
        pending={action.isPending}
        error={action.error}
        onClose={() => {
          setPendingAction(null);
          action.reset();
        }}
        onConfirm={(reason) => runAction(pendingAction, reason)}
      />
    </div>
  );
};

/** Site modülü: şema tasarımı, yayın ve sürümler (şartname §11 modül atama ve şema versiyonları). */
const ModuleDetail = () => {
  const { siteId, instanceId } = useParams();
  const siteQuery = useSite(siteId);
  const moduleQuery = useSiteModule(siteId, instanceId);
  usePageTitle(moduleQuery.data ? labelOf(moduleQuery.data.label) : "Bölüm");
  if (siteQuery.isPending || moduleQuery.isPending) return <Skeleton variant="rectangle" height={320} radius="lg" />;
  if (isApiError(siteQuery.error, "NOT_FOUND") || isApiError(moduleQuery.error, "NOT_FOUND")) return <NotFound />;
  if (siteQuery.isError) return <QueryErrorAlert error={siteQuery.error} onRetry={() => siteQuery.refetch()} />;
  if (moduleQuery.isError) return <QueryErrorAlert error={moduleQuery.error} onRetry={() => moduleQuery.refetch()} />;
  return <ModuleWorkspace key={moduleQuery.data.id} site={siteQuery.data} instance={moduleQuery.data} refetch={moduleQuery.refetch} />;
};

export default ModuleDetail;
