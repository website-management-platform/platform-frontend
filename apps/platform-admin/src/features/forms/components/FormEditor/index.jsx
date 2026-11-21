import { useState } from "react";
import { FiArrowDown, FiArrowUp, FiPlus, FiSend, FiTrash2 } from "react-icons/fi";
import Alert from "@/components/Alert";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import CheckboxGroup from "@/components/CheckboxGroup";
import Drawer from "@/components/Drawer";
import Input from "@/components/Input";
import SegmentedControl from "@/components/SegmentedControl";
import Select from "@/components/Select";
import Skeleton from "@/components/Skeleton";
import Switch from "@/components/Switch";
import Textarea from "@/components/Textarea";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage } from "@/api/errors";
import { formatDateTime } from "@/utils/format";
import { localeLabel } from "../../../sites/locales";
import { usePublishForm, useSiteForm, useUpdateForm } from "../../api";
import "./form_editor.scss";

const FIELD_TYPES = [
  { value: "text", label: "Kısa metin" },
  { value: "textarea", label: "Uzun metin" },
  { value: "email", label: "E-posta" },
  { value: "phone", label: "Telefon" },
  { value: "select", label: "Seçim listesi" },
  { value: "checkbox", label: "Onay kutusu" },
  { value: "date", label: "Tarih" },
  { value: "file", label: "Dosya eki" },
];
const FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Word (DOCX)" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
];
const MB = 1024 * 1024;

const nextKey = (fields, base = "alan") => {
  let index = fields.length + 1;
  while (fields.some((field) => field.key === `${base}${index}`)) index += 1;
  return `${base}${index}`;
};

const newField = (type, fields, locale) => ({
  key: nextKey(fields),
  type,
  label: { [locale]: FIELD_TYPES.find((item) => item.value === type).label },
  ...(type === "select" ? { options: [{ value: "secenek-1", label: { [locale]: "Seçenek 1" } }] } : {}),
  ...(type === "file" ? { allowedFormats: ["pdf"], maxBytes: 5 * MB, maxFiles: 1 } : {}),
});

// Dile göre metin: boş bırakılan dil anahtarı silinir (sunucu boş metni kabul etmez).
const setText = (value, locale, text) => {
  const next = { ...(value ?? {}) };
  if (text) next[locale] = text;
  else delete next[locale];
  return Object.keys(next).length ? next : undefined;
};

const OptionsEditor = ({ field, locale, onChange, errorFor, path }) => (
  <fieldset className="form_editor_options">
    <legend>Seçenekler</legend>
    {field.options.map((option, index) => (
      <div key={index} className="form_editor_option">
        <Input size="sm" label="Değer" value={option.value} error={errorFor(`${path}.options.${index}`)}
          onChange={(event) => onChange({ options: field.options.map((item, i) => (i === index ? { ...item, value: event.target.value.toLowerCase() } : item)) })} />
        <Input size="sm" label={`Etiket (${localeLabel(locale)})`} value={option.label?.[locale] ?? ""}
          onChange={(event) => onChange({ options: field.options.map((item, i) => (i === index ? { ...item, label: setText(item.label, locale, event.target.value) } : item)) })} />
        <Button size="sm" variant="ghost" color="danger" icon={FiTrash2} aria-label={`${index + 1}. seçeneği sil`} disabled={field.options.length === 1}
          onClick={() => onChange({ options: field.options.filter((_, i) => i !== index) })} />
      </div>
    ))}
    <Button size="sm" variant="outline" icon={FiPlus} disabled={field.options.length >= 50}
      onClick={() => onChange({ options: [...field.options, { value: `secenek-${field.options.length + 1}`, label: { [locale]: `Seçenek ${field.options.length + 1}` } }] })}>Seçenek ekle</Button>
  </fieldset>
);

const FieldRow = ({ field, index, count, locale, allowFiles, onChange, onReplace, onMove, onRemove, errorFor }) => {
  const path = `draft.fields.${index}`;
  const typeOptions = FIELD_TYPES.filter((item) => item.value !== "file" || allowFiles || field.type === "file");
  return (
    <li className="form_editor_field">
      <div className="form_editor_field_head">
        <strong>{field.label?.[locale] || field.key}</strong>
        <Badge size="sm" variant="neutral">{FIELD_TYPES.find((item) => item.value === field.type)?.label}</Badge>
        {field.required && <Badge size="sm" variant="info">Zorunlu</Badge>}
        {field.sensitive && <Badge size="sm" variant="warning">Kişisel veri</Badge>}
        <span className="form_editor_field_actions">
          <Button size="sm" variant="ghost" icon={FiArrowUp} aria-label="Yukarı taşı" disabled={index === 0} onClick={() => onMove(-1)} />
          <Button size="sm" variant="ghost" icon={FiArrowDown} aria-label="Aşağı taşı" disabled={index === count - 1} onClick={() => onMove(1)} />
          <Button size="sm" variant="ghost" color="danger" icon={FiTrash2} aria-label={`${field.label?.[locale] || field.key} alanını sil`} disabled={count === 1} onClick={onRemove} />
        </span>
      </div>
      <div className="form_editor_grid">
        <Input size="sm" label="Etiket" value={field.label?.[locale] ?? ""} error={errorFor(`${path}.label`)} onChange={(event) => onChange({ label: setText(field.label, locale, event.target.value) })} />
        <Select size="sm" label="Tip" options={typeOptions} value={typeOptions.find((item) => item.value === field.type)} isSearchable={false}
          onChange={(option) => onReplace({ ...newField(option.value, [], locale), key: field.key, label: field.label, ...(field.required ? { required: true } : {}) })} />
        <Input size="sm" label="Anahtar" hint="Web sitesinin gönderdiği ad; yayından sonra değiştirmeyin." value={field.key} error={errorFor(`${path}.key`)} onChange={(event) => onChange({ key: event.target.value })} />
        <Input size="sm" label="Yardım metni" optionalText="İsteğe bağlı" value={field.help?.[locale] ?? ""} error={errorFor(`${path}.help`)} onChange={(event) => onChange({ help: setText(field.help, locale, event.target.value) })} />
        {["text", "textarea"].includes(field.type) && (
          <Input size="sm" type="number" label="En çok karakter" optionalText="İsteğe bağlı" min={1} max={field.type === "text" ? 500 : 5000} value={field.maxLength ?? ""} error={errorFor(`${path}.maxLength`)}
            onChange={(event) => onChange({ maxLength: event.target.value ? Number(event.target.value) : undefined })} />
        )}
        {field.type === "file" && (
          <>
            <Input size="sm" type="number" label="En büyük dosya (MB)" min={1} max={10} value={Math.round((field.maxBytes ?? MB) / MB)} error={errorFor(`${path}.maxBytes`)} onChange={(event) => onChange({ maxBytes: Number(event.target.value) * MB })} />
            <Input size="sm" type="number" label="En çok dosya" min={1} max={3} value={field.maxFiles ?? 1} error={errorFor(`${path}.maxFiles`)} onChange={(event) => onChange({ maxFiles: Number(event.target.value) })} />
          </>
        )}
      </div>
      {field.type === "file" && (
        <CheckboxGroup label="İzinli biçimler" orientation="horizontal" value={field.allowedFormats ?? []} error={errorFor(`${path}.allowedFormats`)} options={FORMAT_OPTIONS} onChange={(next) => onChange({ allowedFormats: next })} />
      )}
      {field.type === "select" && <OptionsEditor field={field} locale={locale} path={path} errorFor={errorFor} onChange={onChange} />}
      <div className="form_editor_checks">
        <Checkbox label="Zorunlu" checked={field.required === true} onChange={(event) => onChange({ required: event.target.checked || undefined })} />
        <Checkbox label="Kişisel veri" description="Gelen kutusunda işaretlenir; saklamada şifrelenir." checked={field.sensitive === true} onChange={(event) => onChange({ sensitive: event.target.checked || undefined })} />
      </div>
    </li>
  );
};

/**
 * Form tanımı düzenleyici (şartname §17): alanlar, aydınlatma/onay metni, isteğe bağlı pazarlama onayı, saklama süresi
 * ve dosya eki izni. Kaydet taslağı yazar; Yayınla değişmez yeni sürüm üretir (web sitesi yayındaki sürümü okur).
 */
const FormEditorBody = ({ site, form, canManage, onClose }) => {
  const update = useUpdateForm(site.id, form.id);
  const publish = usePublishForm(site.id, form.id);
  const [locale, setLocale] = useState(site.defaultLocale);
  const [values, setValues] = useState(() => ({ title: form.title, status: form.status, settings: form.settings, draft: form.draft }));
  const [dirty, setDirty] = useState(false);
  const error = update.error ?? publish.error;
  const errorFor = (path) => error?.fieldErrors?.find((item) => item.path === path || item.path.startsWith(`${path}.`))?.message;
  const change = (patch) => {
    setValues((current) => ({ ...current, ...patch }));
    setDirty(true);
  };
  const setDraft = (patch) => change({ draft: { ...values.draft, ...patch } });
  const fields = values.draft.fields;
  const setField = (index, patch) => setDraft({ fields: fields.map((field, i) => (i === index ? Object.fromEntries(Object.entries({ ...field, ...patch }).filter(([, value]) => value !== undefined)) : field)) });
  const moveField = (index, delta) => {
    const next = [...fields];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setDraft({ fields: next });
  };
  const save = () => update.mutateAsync({ values, version: form.version }).then((result) => {
    setDirty(false);
    return result;
  });
  const saveAndPublish = async () => {
    const saved = dirty ? await save() : form;
    publish.mutate({ version: saved.version }, { onSuccess: (result) => toast.success(`Sürüm ${result.currentVersion} yayınlandı`) });
  };
  const generalErrors = error?.fieldErrors?.filter((item) => !item.path.startsWith("draft.fields.")) ?? [];

  return (
    <Drawer
      open
      onClose={onClose}
      size="lg"
      title={values.title?.[site.defaultLocale] ?? form.key}
      description={`Anahtar: ${form.key} · Yayındaki sürüm: ${form.currentVersion ?? "yok"}`}
      subheader={site.locales.length > 1 && <SegmentedControl size="sm" ariaLabel="Düzenlenen dil" value={locale} onChange={setLocale} options={site.locales.map((item) => ({ value: item, label: localeLabel(item) }))} />}
      footerStart={form.hasUnpublishedChanges && !dirty && <Badge size="sm" variant="warning" dot>Yayınlanmamış değişiklik</Badge>}
      footer={canManage && (
        <>
          <Button variant="outline" onClick={() => save().then(() => toast.success("Taslak kaydedildi"))} loading={update.isPending} disabled={!dirty}>Taslağı kaydet</Button>
          <Button icon={FiSend} onClick={saveAndPublish} loading={publish.isPending} disabled={!dirty && !form.hasUnpublishedChanges}>Yayınla</Button>
        </>
      )}
    >
      <fieldset className="form_editor" disabled={!canManage}>
        {error && (
          <Alert variant="danger" size="compact" title={getErrorMessage(error)}>
            {generalErrors.length > 0 && <ul>{generalErrors.map((item) => <li key={item.path}>{item.message}</li>)}</ul>}
          </Alert>
        )}
        <section className="form_editor_section" aria-labelledby="form-editor-general">
          <h3 id="form-editor-general">Genel</h3>
          <div className="form_editor_grid">
            <Input label={`Form adı (${localeLabel(locale)})`} required={locale === site.defaultLocale} value={values.title?.[locale] ?? ""} error={errorFor("title")} onChange={(event) => change({ title: setText(values.title, locale, event.target.value) })} />
            <Input type="number" label="Başvuru saklama süresi (gün)" min={7} max={730} hint="Süre dolunca başvuru ve ekleri kalıcı olarak silinir." value={values.settings.retentionDays} error={errorFor("settings.retentionDays")}
              onChange={(event) => change({ settings: { ...values.settings, retentionDays: Number(event.target.value) } })} />
          </div>
          <Textarea label={`Gönderim sonrası mesaj (${localeLabel(locale)})`} optionalText="İsteğe bağlı" rows={2} maxLength={300} value={values.settings.successMessage?.[locale] ?? ""}
            onChange={(event) => change({ settings: { ...values.settings, successMessage: setText(values.settings.successMessage, locale, event.target.value) ?? null } })} />
          <Switch label="Form açık" description="Kapalı form web sitesinde görünmez ve başvuru almaz; gelen başvurular korunur." checked={values.status === "active"} onChange={(event) => change({ status: event.target.checked ? "active" : "disabled" })} />
          <Switch label="Dosya eki izni" description="Varsayılan kapalıdır. Ekler taranır, özel alanda saklanır ve medya kütüphanesine girmez." checked={values.settings.allowFiles}
            onChange={(event) => change({ settings: { ...values.settings, allowFiles: event.target.checked } })} />
        </section>

        <section className="form_editor_section" aria-labelledby="form-editor-fields">
          <h3 id="form-editor-fields">Alanlar</h3>
          <p className="form_editor_hint">Yalnız gerekli bilgiyi isteyin. Sağlık gibi özel nitelikli veri toplayan form kurmayın.</p>
          <ol className="form_editor_fields">
            {fields.map((field, index) => (
              <FieldRow key={index} field={field} index={index} count={fields.length} locale={locale} allowFiles={values.settings.allowFiles} errorFor={errorFor}
                onChange={(patch) => setField(index, patch)} onReplace={(next) => setDraft({ fields: fields.map((item, i) => (i === index ? next : item)) })} onMove={(delta) => moveField(index, delta)} onRemove={() => setDraft({ fields: fields.filter((_, i) => i !== index) })} />
            ))}
          </ol>
          <div className="form_editor_add">
            {FIELD_TYPES.filter((item) => item.value !== "file" || values.settings.allowFiles).map((item) => (
              <Button key={item.value} size="sm" variant="outline" icon={FiPlus} disabled={fields.length >= 30} onClick={() => setDraft({ fields: [...fields, newField(item.value, fields, locale)] })}>{item.label}</Button>
            ))}
          </div>
        </section>

        <section className="form_editor_section" aria-labelledby="form-editor-consent">
          <h3 id="form-editor-consent">Aydınlatma ve onay</h3>
          <Textarea label={`Onay metni (${localeLabel(locale)})`} required rows={3} maxLength={2000} hint="Metin değişince onay sürümü artar; her başvuru kabul ettiği sürümü saklar." value={values.draft.consent?.text?.[locale] ?? ""} error={errorFor("draft.consent.text")}
            onChange={(event) => setDraft({ consent: { ...values.draft.consent, text: setText(values.draft.consent?.text, locale, event.target.value) } })} />
          <Input label="Aydınlatma metni adresi" optionalText="İsteğe bağlı" type="url" placeholder="https://" value={values.draft.consent?.privacyUrl ?? ""} error={errorFor("draft.consent.privacyUrl")}
            onChange={(event) => setDraft({ consent: { ...values.draft.consent, privacyUrl: event.target.value || undefined } })} />
          <Switch label="Ayrı pazarlama izni" description="İsteğe bağlı ikinci onay kutusu; işaretlenmeden de form gönderilir." checked={Boolean(values.draft.marketingConsent)}
            onChange={(event) => setDraft({ marketingConsent: event.target.checked ? { text: { [site.defaultLocale]: "Duyuru ve bülten almak istiyorum." } } : null })} />
          {values.draft.marketingConsent && (
            <Input label={`Pazarlama izni metni (${localeLabel(locale)})`} value={values.draft.marketingConsent.text?.[locale] ?? ""} error={errorFor("draft.marketingConsent.text")}
              onChange={(event) => setDraft({ marketingConsent: { text: setText(values.draft.marketingConsent.text, locale, event.target.value) } })} />
          )}
        </section>

        {form.versions.length > 0 && (
          <section className="form_editor_section" aria-labelledby="form-editor-versions">
            <h3 id="form-editor-versions">Sürümler</h3>
            <ul className="form_editor_versions">
              {form.versions.map((version) => (
                <li key={version.id}>Sürüm {version.version} · onay sürümü {version.consentVersion} · {version.fieldCount} alan · {version.createdBy?.displayName} · {formatDateTime(version.createdAt)}</li>
              ))}
            </ul>
          </section>
        )}
      </fieldset>
    </Drawer>
  );
};

const FormEditor = ({ site, formId, canManage, onClose }) => {
  const query = useSiteForm(site.id, formId);
  if (!query.data) {
    return (
      <Drawer open onClose={onClose} size="lg" title="Form">
        {query.isError ? <Alert variant="danger">{getErrorMessage(query.error)}</Alert> : <Skeleton variant="rectangle" height={320} radius="md" />}
      </Drawer>
    );
  }
  return <FormEditorBody site={site} form={query.data} canManage={canManage} onClose={onClose} />;
};

export default FormEditor;
