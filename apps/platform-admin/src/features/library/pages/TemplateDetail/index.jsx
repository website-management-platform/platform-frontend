import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { FiArchive, FiCopy, FiRotateCcw, FiUploadCloud } from "react-icons/fi";
import { diffSchemas, labelOf, validateSchema } from "@wmp/schema";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ButtonGroup from "@/components/ButtonGroup";
import PageHeader from "@/components/PageHeader";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import Tabs, { TabPanel } from "@/components/Tabs";
import { toast } from "@/components/Toast/toast";
import { isApiError } from "@/api/errors";
import { usePlatformCan } from "@/auth/api";
import { useConfirm } from "@/hooks/useConfirm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSearchParamsState } from "@/hooks/useSearchParamsState";
import NotFound from "@/pages/NotFound";
import AutosaveStatus from "../../../schema-designer/components/AutosaveStatus";
import SchemaDesigner from "../../../schema-designer/components/SchemaDesigner";
import { useDraftAutosave } from "../../../schema-designer/hooks/useDraftAutosave";
import { KIND_LABELS } from "../../../schema-designer/labels";
import CloneModal from "../../components/CloneModal";
import PublishVersionModal from "../../components/PublishVersionModal";
import TemplateUsages from "../../components/TemplateUsages";
import TemplateVersions from "../../components/TemplateVersions";
import { useFieldGroups, useFieldTypes, useTemplate, useTemplateAction, useTemplateVersion, useUpdateTemplate } from "../../api";
import "./template_detail.scss";

const TAB_DEFAULTS = { sekme: "tasarim" };
const TEMPLATE_LOCALES = ["tr", "en"];

// Tasarım sekmesi: taslak otomatik kaydedilir; yayın ayrı ve açık bir işlemdir.
const TemplateDesign = ({ template, canManage, refetch }) => {
  const update = useUpdateTemplate(template.id);
  const fieldTypesQuery = useFieldTypes();
  const fieldGroupsQuery = useFieldGroups({ status: "ACTIVE" });
  const latestQuery = useTemplateVersion(template.id, template.latestVersion || null);
  const editable = canManage && template.status === "ACTIVE";
  const autosave = useDraftAutosave({
    serverDraft: template.draft,
    serverVersion: template.version,
    enabled: editable,
    save: (draft, version) => update.mutateAsync({ values: { draft }, version }),
  });
  const [publishOpen, setPublishOpen] = useState(false);

  if (fieldTypesQuery.isPending) return <Skeleton variant="rectangle" height={400} radius="lg" />;
  if (fieldTypesQuery.isError) return <QueryErrorAlert error={fieldTypesQuery.error} onRetry={() => fieldTypesQuery.refetch()} />;

  // Yayınlanmış alan sonraki sürümde silinmez, arşivlenir (sitelerin yükseltmesinde veri korunur).
  const baseSchema = latestQuery.data?.schema ?? null;
  const errors = validateSchema(autosave.draft, { locales: TEMPLATE_LOCALES, base: baseSchema });
  const changed = template.latestVersion === 0 || (latestQuery.data && diffSchemas(latestQuery.data.schema, autosave.draft).hasChanges);
  const canPublish = editable && errors.length === 0 && changed && autosave.status === "saved";

  const toolbar = editable && (
    <div className="template_detail_toolbar">
      <AutosaveStatus
        status={autosave.status}
        error={autosave.error}
        onRetry={autosave.saveNow}
        onReload={async () => {
          const { data } = await refetch();
          if (data) autosave.reset(data.draft, data.version);
        }}
      />
      <div className="template_detail_publish">
        {!changed && template.latestVersion > 0 && <span className="template_detail_hint">Taslak son sürümle aynı.</span>}
        <Button icon={FiUploadCloud} disabled={!canPublish} onClick={() => setPublishOpen(true)}>
          {template.latestVersion === 0 ? "İlk sürümü yayınla" : "Yeni sürüm yayınla"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <SchemaDesigner
        schema={autosave.draft}
        onChange={autosave.change}
        baseSchema={baseSchema}
        locales={TEMPLATE_LOCALES}
        fieldTypes={fieldTypesQuery.data.items}
        families={fieldTypesQuery.data.families}
        fieldGroups={fieldGroupsQuery.data?.items ?? []}
        readOnly={!editable}
        excludeTemplateId={template.id}
        toolbar={toolbar}
      />
      {publishOpen && (
        <PublishVersionModal
          template={template}
          getVersion={() => autosave.version.current}
          draft={autosave.draft}
          onClose={() => setPublishOpen(false)}
          onPublished={(next) => {
            setPublishOpen(false);
            autosave.reset(next.draft, next.version);
            toast.success(`${labelOf(next.label)} v${next.latestVersion} yayınlandı`);
          }}
        />
      )}
    </>
  );
};

/** Şablon detayı: tasarım, sürümler ve kullanım (şartname §11 modül kütüphanesi ve tasarımcısı). */
const TemplateDetail = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const can = usePlatformCan();
  const confirm = useConfirm();
  const templateQuery = useTemplate(templateId);
  const action = useTemplateAction(templateId);
  const [tab, setTab] = useSearchParamsState(TAB_DEFAULTS);
  const [cloneOpen, setCloneOpen] = useState(false);
  const template = templateQuery.data;
  usePageTitle(template ? labelOf(template.label) : "Şablon");

  if (templateQuery.isPending) return <Skeleton variant="rectangle" height={320} radius="lg" />;
  if (isApiError(templateQuery.error, "NOT_FOUND")) return <NotFound />;
  if (templateQuery.isError) return <QueryErrorAlert error={templateQuery.error} onRetry={() => templateQuery.refetch()} />;

  const canManage = can("platform.library.manage");
  const tabs = [
    { id: "tasarim", label: "Tasarım" },
    { id: "surumler", label: "Sürümler", badge: template.latestVersion },
    { id: "kullanim", label: "Kullanım", badge: template.usageCount },
  ];
  const activeTab = tabs.some((item) => item.id === tab.sekme) ? tab.sekme : TAB_DEFAULTS.sekme;

  const toggleArchive = async () => {
    const archiving = template.status === "ACTIVE";
    const ok = await confirm({
      variant: archiving ? "warning" : "default",
      title: archiving ? `${labelOf(template.label)} arşivlensin mi?` : `${labelOf(template.label)} arşivden çıkarılsın mı?`,
      description: archiving ? "Arşivlenen şablon yeni sitelere ve site şablonlarına eklenemez. Şablonu kullanan bölümler etkilenmez." : "Şablon yeniden sitelere eklenebilir.",
      confirmLabel: archiving ? "Arşivle" : "Arşivden çıkar",
      onConfirm: () => action.mutateAsync({ action: archiving ? "archive" : "restore", version: template.version }),
    });
    if (ok) toast.success(archiving ? "Şablon arşivlendi" : "Şablon arşivden çıkarıldı");
  };

  return (
    <div className="template_detail">
      <PageHeader
        title={labelOf(template.label)}
        description={template.description || `Anahtar: ${template.key}`}
        badge={(
          <span className="template_detail_badges">
            <Badge variant="neutral">{KIND_LABELS[template.kind]}</Badge>
            {template.latestVersion > 0 ? <Badge variant="accent">v{template.latestVersion}</Badge> : <Badge variant="warning">Yayınlanmadı</Badge>}
            {template.status === "ARCHIVED" && <Badge variant="neutral">Arşivde</Badge>}
          </span>
        )}
        breadcrumb={[{ label: "Bölüm şablonları", path: "/moduller" }, { label: labelOf(template.label) }]}
        actions={canManage && (
          <ButtonGroup attached={false} ariaLabel="Şablon işlemleri">
            <Button variant="outline" icon={FiCopy} disabled={template.latestVersion === 0} onClick={() => setCloneOpen(true)}>Kopyala</Button>
            <Button variant="outline" icon={template.status === "ACTIVE" ? FiArchive : FiRotateCcw} onClick={toggleArchive}>{template.status === "ACTIVE" ? "Arşivle" : "Arşivden çıkar"}</Button>
          </ButtonGroup>
        )}
      />
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setTab({ sekme: id }, { replace: true })} idPrefix="template" ariaLabel="Şablon bölümleri" />
      <TabPanel id="tasarim" activeTab={activeTab} idPrefix="template">
        <TemplateDesign key={template.id} template={template} canManage={canManage} refetch={templateQuery.refetch} />
      </TabPanel>
      <TabPanel id="surumler" activeTab={activeTab} idPrefix="template">
        <TemplateVersions templateId={template.id} />
      </TabPanel>
      <TabPanel id="kullanim" activeTab={activeTab} idPrefix="template">
        <TemplateUsages templateId={template.id} latestVersion={template.latestVersion} />
      </TabPanel>
      {cloneOpen && (
        <CloneModal
          title="Şablonu kopyala"
          description="Kopya, son yayınlanmış sürümün alanlarını yeni kimliklerle alır ve taslak olarak başlar."
          sourceKey={template.key}
          sourceLabel={labelOf(template.label)}
          keyHint="Platform genelinde benzersiz."
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
              navigate(`/moduller/${copy.id}`);
            },
          })}
        />
      )}
    </div>
  );
};

export default TemplateDetail;
