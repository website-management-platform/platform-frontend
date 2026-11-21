import { useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { labelOf } from "@wmp/schema";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import Drawer from "@/components/Drawer";
import Select from "@/components/Select";
import Skeleton from "@/components/Skeleton";
import Table from "@/components/Table";
import Textarea from "@/components/Textarea";
import { getErrorMessage, isApiError } from "@/api/errors";
import DiffList from "../../../schema-designer/components/DiffList";
import { DRY_RUN_ERROR_HINTS } from "../../../schema-designer/labels";
import { usePublishSchema, useSchemaDryRun } from "../../api";
import "./publish_schema_drawer.scss";

const STATUS_META = {
  compatible: { variant: "success", title: "Yayına hazır", text: "Bütün kayıtlar yeni yapıya uyuyor." },
  requiresConfirmation: { variant: "warning", title: "Açık onay gerekiyor", text: "Değişiklik web sitesinin okuduğu API'yi bozuyor (anahtar, tip veya ilişki). Entegrasyonu güncelleyecek ekibe haber verin." },
  blocked: { variant: "danger", title: "Yayın engellendi", text: "Dönüştürülemeyen kayıtlar veya yapı hataları var. Canlı veri değişmez." },
};

const MULTI_TO_SINGLE = new Set(["multiselect", "relationList", "imageGallery", "videoGallery"]);

// Dönüşüm kararı gerektiren değişiklikler farktan çıkarılır (karar verildikten sonra da görünür kalsın diye hatalardan değil):
// dile bağlı → ortak alanda kaynak dil, çoklu → tekli dönüşümde ilk değeri koruma.
const planControls = (report) => report.diff.changes.flatMap((change) => {
  const count = report.errors.filter((error) => error.fieldId === change.fieldId).length;
  const controls = [];
  if (change.details.some((detail) => detail.property === "localized" && detail.from === true && !detail.to)) controls.push([change.fieldId, { code: "LOCALE_CONFLICT", count }]);
  if (change.details.some((detail) => detail.property === "type" && MULTI_TO_SINGLE.has(detail.from))) controls.push([change.fieldId, { code: "MULTIPLE_VALUES", count }]);
  return controls;
});

/**
 * Şema yayın akışı (şartname §6.2, §25.3): fark → dry-run (kayıt denetimi, dönüşüm planı) → onay ve yayın.
 * Yayın, dry-run'daki plan özeti ve veri durumuyla yapılır; arada veri değişirse sunucu reddeder ve dry-run yinelenir.
 */
const PublishSchemaDrawer = ({ siteId, instance, draft, locales, getVersion, onClose, onPublished }) => {
  const dryRun = useSchemaDryRun(siteId, instance.id);
  const publish = usePublishSchema(siteId, instance.id);
  const [plan, setPlan] = useState({ fields: {} });
  const [confirmBreaking, setConfirmBreaking] = useState(false);
  const [changelog, setChangelog] = useState("");
  const report = dryRun.data;
  const { mutate: runDryRun } = dryRun;

  useEffect(() => {
    runDryRun({ plan });
  }, [plan, runDryRun]);

  const setFieldPlan = (fieldId, value) => setPlan((current) => {
    const fields = { ...current.fields };
    if (value) fields[fieldId] = value;
    else delete fields[fieldId];
    return { fields };
  });

  const fieldLabel = (fieldId) => labelOf(draft.fields.find((field) => field.id === fieldId)?.label) || "Alan";
  const status = report ? STATUS_META[report.compatibilityStatus] : null;
  const canPublish = report && !dryRun.isPending && report.compatibilityStatus !== "blocked" && (report.compatibilityStatus !== "requiresConfirmation" || confirmBreaking);

  const submit = () => publish.mutate({
    version: getVersion(),
    values: { plan, migrationPlanHash: report.migrationPlanHash, dataWatermark: report.dataWatermark, confirmBreaking, changelog: changelog.trim() || null },
  }, {
    onSuccess: onPublished,
    onError: (error) => {
      if (isApiError(error, "DRY_RUN_STALE")) runDryRun({ plan });
    },
  });

  return (
    <Drawer
      open
      onClose={onClose}
      title={`${labelOf(instance.label)} · v${instance.activeVersion + 1} yayını`}
      description="Taslak yayınlanınca müşteri panelinde ve yayın API'sinde yeni yapı geçerli olur."
      size="lg"
      busy={publish.isPending}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={publish.isPending}>Vazgeç</Button>
          <Button onClick={submit} loading={publish.isPending} disabled={!canPublish}>Yayınla</Button>
        </>
      )}
    >
      <div className="publish_schema_drawer">
        {publish.isError && (
          <Alert variant="danger" title="Yayınlanamadı">
            {getErrorMessage(publish.error)} {(publish.error.fieldErrors ?? []).slice(0, 3).map((item) => item.message).join(" ")}
          </Alert>
        )}

        <section aria-labelledby="publish-diff" className="publish_schema_drawer_section">
          <h3 id="publish-diff">Değişiklikler</h3>
          {!report && <Skeleton variant="rectangle" height={120} />}
          {report && <DiffList diff={report.diff} />}
        </section>

        <section aria-labelledby="publish-check" className="publish_schema_drawer_section">
          <div className="publish_schema_drawer_heading">
            <h3 id="publish-check">Kayıt denetimi</h3>
            <Button variant="ghost" size="sm" icon={FiRefreshCw} loading={dryRun.isPending} onClick={() => runDryRun({ plan })}>Yeniden denetle</Button>
          </div>
          {dryRun.isError && <Alert variant="danger" size="compact">{getErrorMessage(dryRun.error)}</Alert>}
          {report && (
            <>
              <Alert variant={status.variant} title={status.title} size="compact">{status.text}</Alert>
              <dl className="publish_schema_drawer_counts">
                <div><dt>Kayıt</dt><dd>{report.counts.entries}</dd></div>
                <div><dt>Dönüşecek</dt><dd>{report.counts.changed}</dd></div>
                <div><dt>Varsayılanla dolacak</dt><dd>{report.counts.backfilled}</dd></div>
                <div><dt>Dönüştürülemeyen</dt><dd>{report.counts.failed}</dd></div>
              </dl>
              {report.schemaErrors.length > 0 && (
                <Alert variant="danger" size="compact" title="Yapı hataları">{report.schemaErrors.slice(0, 5).map((error) => error.message).join(" ")}</Alert>
              )}
              {planControls(report).length > 0 && (
                <div className="publish_schema_drawer_plan">
                  <h4>Dönüşüm kararları</h4>
                  {planControls(report).map(([fieldId, item]) => (item.code === "LOCALE_CONFLICT" ? (
                    <Select
                      key={fieldId}
                      label={`${fieldLabel(fieldId)}: ortak değere hangi dil geçsin?`}
                      size="sm"
                      options={locales.map((locale) => ({ value: locale, label: locale }))}
                      value={plan.fields[fieldId]?.sourceLocale ? { value: plan.fields[fieldId].sourceLocale, label: plan.fields[fieldId].sourceLocale } : null}
                      onChange={(option) => setFieldPlan(fieldId, option ? { sourceLocale: option.value } : null)}
                      isClearable
                      hint={item.count > 0 ? `${item.count} kayıtta diller farklı. Seçilmeyen dillerin değeri geçmişte kalır.` : "Diller aynıysa seçim gerekmez; seçilmeyen dillerin değeri geçmişte kalır."}
                    />
                  ) : (
                    <Checkbox
                      key={fieldId}
                      label={`${fieldLabel(fieldId)}: birden çok değeri olan kayıtlarda ilk değeri koru`}
                      description={item.count > 0 ? `${item.count} kayıt etkileniyor. Diğer değerler geçmişte kalır.` : "Diğer değerler geçmişte kalır."}
                      checked={plan.fields[fieldId]?.pick === "first"}
                      onChange={(event) => setFieldPlan(fieldId, event.target.checked ? { pick: "first" } : null)}
                    />
                  )))}
                </div>
              )}
              {report.errors.length > 0 && (
                <Table variant="bordered" caption="Dönüştürülemeyen kayıtlar" hideCaption>
                  <thead><tr><th scope="col">Kayıt</th><th scope="col">Alan</th><th scope="col">Sorun</th></tr></thead>
                  <tbody>
                    {report.errors.map((error, index) => (
                      <tr key={`${error.entryId}-${error.path}-${index}`}>
                        <td>{error.entryLabel ?? "Bölüm"}</td>
                        <td><code>{error.path}</code></td>
                        <td>{error.message}{DRY_RUN_ERROR_HINTS[error.code] && <span className="publish_schema_drawer_hint">{DRY_RUN_ERROR_HINTS[error.code]}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {report.warnings.length > 0 && (
                <ul className="publish_schema_drawer_warnings">
                  {report.warnings.map((warning) => <li key={`${warning.fieldId}-${warning.code}`}>{fieldLabel(warning.fieldId)}: {warning.message} ({warning.count} kayıt)</li>)}
                </ul>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="publish-confirm" className="publish_schema_drawer_section">
          <h3 id="publish-confirm">Yayın</h3>
          {report?.compatibilityStatus === "requiresConfirmation" && (
            <Checkbox label="API sözleşmesindeki değişikliği onaylıyorum" description="Web sitesi entegrasyonu yeni anahtar ve tiplere göre güncellenecek." checked={confirmBreaking} onChange={(event) => setConfirmBreaking(event.target.checked)} />
          )}
          <Textarea label="Değişiklik notu" optionalText="İsteğe bağlı" rows={2} maxLength={500} value={changelog} onChange={(event) => setChangelog(event.target.value)} />
        </section>
      </div>
    </Drawer>
  );
};

export default PublishSchemaDrawer;
