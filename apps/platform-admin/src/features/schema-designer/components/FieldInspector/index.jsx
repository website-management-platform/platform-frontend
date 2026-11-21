import { FiAlertTriangle } from "react-icons/fi";
import { FIELD_KEY_PATTERN, defaultSettings, getFieldType, isConvertible, labelOf } from "@wmp/schema";
import Alert from "@/components/Alert";
import Input from "@/components/Input";
import SegmentedControl from "@/components/SegmentedControl";
import Select from "@/components/Select";
import Switch from "@/components/Switch";
import Textarea from "@/components/Textarea";
import { REQUIRED_ON_OPTIONS, UNIQUE_OPTIONS, WIDTH_OPTIONS } from "../../labels";
import { suggestFieldKey } from "../../schemaOps";
import BlocksEditor from "../BlocksEditor";
import ConditionEditor from "../ConditionEditor";
import DefaultValueInput from "../DefaultValueInput";
import OptionsEditor from "../OptionsEditor";
import SettingsForm from "../SettingsForm";
import FieldTypeIcon from "../FieldTypeIcon";
import "./field_inspector.scss";

// Ayarlar tip değişince korunabilenler: seçenekler (tek ↔ çoklu seçim) ve ilişki hedefi.
const carrySettings = (from, toType) => {
  const next = defaultSettings(toType);
  const allowed = new Set(getFieldType(toType).settings.map((item) => item.key));
  ["options", "targetModule", "displayField", "maxLength", "minLength", "allowedFormats", "maxSizeMb", "altRequiredOnPublish"].forEach((key) => {
    if (allowed.has(key) && from[key] !== undefined) next[key] = from[key];
  });
  return next;
};

// Hata yolundan alan özelliği: "fields.2.settings.maxLength" → "settings.maxLength".
const errorsByProperty = (errors) => {
  const map = {};
  errors.forEach((error) => {
    const match = /(?:^|\.)(label|key|type|help|placeholder|settings\.[a-zA-Z]+|settings|defaultValue|condition|unique|localized|public|sensitive|readOnly|hidden|filterable|sortable|searchable|required|ui\.[a-z]+|fields|blocks|permissions)(?:\.|$)/.exec(error.path.replace(/^fields(\.\d+(\.(fields|blocks\.\d+\.fields)))*\.\d+\.?/, "."));
    const key = match?.[1] ?? "_";
    if (!map[key]) map[key] = error.message;
  });
  return map;
};

const Section = ({ title, children }) => (
  <section className="field_inspector_section" aria-label={title}>
    <h3 className="field_inspector_heading">{title}</h3>
    <div className="field_inspector_section_body">{children}</div>
  </section>
);

/**
 * Seçili alanın özellikleri (şartname §25.2). Tipin desteklemediği seçenek gösterilmez; çelişen ayarlar
 * doğrulamada yol bilgisiyle gösterilir ve sunucuda reddedilir.
 */
const FieldInspector = ({ field, schema, locales, moduleOptions = null, publishedField = null, topLevel, errors = [], fieldTypes, context = "content", onChange, readOnly = false }) => {
  const fieldType = getFieldType(field.type);
  const published = Boolean(publishedField);
  const propertyErrors = errorsByProperty(errors);
  const settingErrors = Object.fromEntries(Object.entries(propertyErrors).filter(([key]) => key.startsWith("settings.")).map(([key, message]) => [key.slice(9), message]));
  const set = (patch) => onChange(patch);
  const typeOptions = fieldTypes
    .filter((item) => item.availability === "available" && item.contexts.includes(context) && Boolean(item.container) === Boolean(fieldType?.container))
    .map((item) => ({ value: item.id, label: item.label, convertible: !published || isConvertible(publishedField.type, item.id) }));
  const candidates = topLevel ? schema.fields.filter((item) => item.id !== field.id && !item.archived && item.type !== "computed") : [];
  const groups = schema.ui?.form?.groups ?? [];
  const groupOptions = [{ value: "", label: "Grup yok" }, ...groups.map((group) => ({ value: group.id, label: labelOf(group.label) }))];
  const siblingKeys = schema.fields.filter((item) => item.id !== field.id).map((item) => item.key);
  const publishedOptionIds = new Set((publishedField?.settings?.options ?? []).map((option) => option.id));
  const publishedBlockKeys = new Set((publishedField?.blocks ?? []).map((block) => block.key));

  if (!fieldType) {
    return (
      <aside className="field_inspector" aria-label="Alan özellikleri">
        <Alert variant="danger" title="Bilinmeyen alan tipi">Bu alanın tipi ({field.type}) registry'de yok; yayınlanamaz. Alanı silin veya arşivleyin.</Alert>
      </aside>
    );
  }

  return (
    <aside className="field_inspector" aria-label={`${labelOf(field.label) || field.key} alanının özellikleri`}>
      <div className="field_inspector_title">
        <span className="field_inspector_icon" aria-hidden="true"><FieldTypeIcon type={field.type} /></span>
        <div>
          <p className="field_inspector_name">{labelOf(field.label) || field.key}</p>
          <p className="field_inspector_type">{fieldType.label}{field.archived ? " · arşivde" : ""}</p>
        </div>
      </div>
      {field.archived && <Alert variant="info" size="compact">Arşivli alan formda ve yayında görünmez; değerleri ve geçmişi korunur.</Alert>}

      <fieldset className="field_inspector_fieldset" disabled={readOnly || field.archived}>
        <Section title="Temel bilgiler">
          <Input
            label="Etiket"
            size="sm"
            required
            value={field.label?.tr ?? ""}
            maxLength={120}
            error={propertyErrors.label}
            onChange={(event) => {
              const label = event.target.value;
              const autoKey = !published && field.key === suggestFieldKey(field.label?.tr ?? "");
              const nextKey = suggestFieldKey(label);
              set({ label: { ...field.label, tr: label }, ...(autoKey && nextKey && FIELD_KEY_PATTERN.test(nextKey) && !siblingKeys.includes(nextKey) ? { key: nextKey } : {}) });
            }}
          />
          {locales.filter((locale) => locale !== "tr").map((locale) => (
            <Input
              key={locale}
              label={`Etiket (${locale})`}
              size="sm"
              optionalText="İsteğe bağlı"
              maxLength={120}
              value={field.label?.[locale] ?? ""}
              onChange={(event) => {
                const next = { ...field.label, [locale]: event.target.value };
                if (!event.target.value) delete next[locale];
                set({ label: next });
              }}
            />
          ))}
          <Input
            label="API anahtarı"
            size="sm"
            required
            value={field.key}
            maxLength={64}
            spellCheck={false}
            className="field_inspector_mono"
            error={propertyErrors.key}
            hint={published ? "Yayınlanmış alanın anahtarı değişirse web sitesi entegrasyonu bozulur; yayında açık onay istenir." : "Web sitesinin veriyi okuduğu ad. Küçük harfle başlar; harf, rakam, alt çizgi."}
            onChange={(event) => set({ key: event.target.value.trim() })}
          />
          <Select
            label="Tip"
            size="sm"
            options={typeOptions}
            value={typeOptions.find((option) => option.value === field.type) ?? null}
            isOptionDisabled={(option) => !option.convertible}
            onChange={(option) => option && option.value !== field.type && set({ type: option.value, settings: carrySettings(field.settings ?? {}, option.value), defaultValue: undefined, localized: field.localized && getFieldType(option.value).localizable, unique: getFieldType(option.value).unique ? field.unique : "none", filterable: field.filterable && getFieldType(option.value).filterable, sortable: field.sortable && getFieldType(option.value).sortable, searchable: field.searchable && getFieldType(option.value).searchable, ui: { ...field.ui, widget: undefined } })}
            hint={published ? "Yalnız mevcut kayıtları dönüştürülebilen tiplere geçilebilir; kayıt denetimi kayıtları sınar." : undefined}
            error={propertyErrors.type}
          />
          <Textarea label="Yardım metni" size="sm" rows={2} optionalText="İsteğe bağlı" maxLength={500} value={field.help?.tr ?? ""} onChange={(event) => set({ help: event.target.value ? { ...field.help, tr: event.target.value } : undefined })} />
          {["string", "decimal", "integer"].includes(fieldType.valueKind) && (
            <Input label="Yer tutucu" size="sm" optionalText="İsteğe bağlı" maxLength={200} value={field.placeholder?.tr ?? ""} onChange={(event) => set({ placeholder: event.target.value ? { tr: event.target.value } : undefined })} />
          )}
        </Section>

        {fieldType.container === "blocks" && (
          <Section title="Bloklar">
            <BlocksEditor blocks={field.blocks} publishedKeys={publishedBlockKeys} onChange={(blocks) => set({ blocks })} />
          </Section>
        )}

        <Section title="Kurallar">
          {!fieldType.readOnly && (
            <>
              <Switch label="Zorunlu" description="Boş metin, boş liste ve boş değer kabul edilmez; hayır ve 0 geçerlidir." size="sm" checked={Boolean(field.required)} onChange={(event) => set({ required: event.target.checked })} />
              {field.required && (
                <SegmentedControl size="sm" ariaLabel="Zorunluluk ne zaman denetlensin" options={REQUIRED_ON_OPTIONS} value={field.requiredOn ?? "publish"} onChange={(requiredOn) => set({ requiredOn })} />
              )}
              <Switch label="Salt okunur" description="Müşteri panelinde değiştirilemez; değer varsayılandan veya API'den gelir." size="sm" checked={Boolean(field.readOnly)} onChange={(event) => set({ readOnly: event.target.checked })} />
            </>
          )}
          {fieldType.unique && topLevel && (
            <Select label="Benzersizlik" size="sm" options={UNIQUE_OPTIONS.filter((option) => option.value !== "locale" || field.localized)} value={UNIQUE_OPTIONS.find((option) => option.value === (field.unique ?? "none"))} onChange={(option) => set({ unique: option?.value ?? "none" })} error={propertyErrors.unique} />
          )}
          {fieldType.settings.some((item) => item.kind === "options") && (
            <OptionsEditor options={field.settings?.options ?? []} publishedIds={publishedOptionIds} error={settingErrors.options} onChange={(options) => set({ settings: { ...field.settings, options } })} />
          )}
          <SettingsForm fieldType={fieldType} settings={field.settings ?? {}} errors={settingErrors} moduleOptions={moduleOptions} siblingKeys={siblingKeys} onChange={(settings) => set({ settings })} />
          {fieldType.defaultable && <DefaultValueInput field={field} error={propertyErrors.defaultValue} onChange={(defaultValue) => set({ defaultValue })} />}
        </Section>

        <Section title="Dil ve yayın">
          {fieldType.localizable && (
            <Switch label="Dile bağlı" description="Her dil için ayrı değer girilir. Yayından sonra değişirse kayıtlar dönüştürülür." size="sm" checked={Boolean(field.localized)} onChange={(event) => set({ localized: event.target.checked, unique: !event.target.checked && field.unique === "locale" ? "site" : field.unique })} />
          )}
          <Switch label="Web sitesinde yayınlanır" description="Kapalıysa değer yalnız panelde görünür; yayın API'sinde hiçbir derinlikte yer almaz." size="sm" checked={Boolean(field.public)} onChange={(event) => set({ public: event.target.checked })} />
          <Switch label="Hassas veri" description="Kişisel veya gizli bilgi; yayınlanamaz ve dışa aktarmada maskelenir." size="sm" checked={Boolean(field.sensitive)} onChange={(event) => set({ sensitive: event.target.checked, public: event.target.checked ? false : field.public })} />
          {topLevel && fieldType.searchable && <Switch label="Panel aramasında" size="sm" checked={Boolean(field.searchable)} onChange={(event) => set({ searchable: event.target.checked })} />}
          {topLevel && fieldType.filterable && <Switch label="Süzgeçte kullanılabilir" size="sm" checked={Boolean(field.filterable)} onChange={(event) => set({ filterable: event.target.checked })} />}
          {topLevel && fieldType.sortable && <Switch label="Sıralamada kullanılabilir" size="sm" checked={Boolean(field.sortable)} onChange={(event) => set({ sortable: event.target.checked })} />}
          {(propertyErrors.public || propertyErrors.sensitive || propertyErrors.localized || propertyErrors.filterable || propertyErrors.sortable || propertyErrors.searchable) && (
            <p className="field_inspector_error" role="alert"><FiAlertTriangle aria-hidden="true" /> {propertyErrors.public || propertyErrors.sensitive || propertyErrors.localized || propertyErrors.filterable || propertyErrors.sortable || propertyErrors.searchable}</p>
          )}
        </Section>

        <Section title="Görünüm">
          <SegmentedControl size="sm" ariaLabel="Form genişliği" options={WIDTH_OPTIONS} value={field.ui?.width ?? "full"} onChange={(width) => set({ ui: { ...field.ui, width } })} />
          {fieldType.widgets.length > 1 && (
            <Select
              label="Düzenleyici"
              size="sm"
              options={fieldType.widgets.map((widget) => ({ value: widget.id, label: widget.label }))}
              value={fieldType.widgets.map((widget) => ({ value: widget.id, label: widget.label })).find((option) => option.value === (field.ui?.widget ?? fieldType.widgets[0].id))}
              onChange={(option) => set({ ui: { ...field.ui, widget: option?.value } })}
              hint="Görünüşü değiştirir; kayıtlı veri etkilenmez."
            />
          )}
          {topLevel && groups.length > 0 && (
            <Select label="Form grubu" size="sm" options={groupOptions} value={groupOptions.find((option) => option.value === (field.ui?.group ?? ""))} onChange={(option) => set({ ui: { ...field.ui, group: option?.value || undefined } })} error={propertyErrors["ui.group"]} />
          )}
          <Switch label="Formda gizli" description="Alan formda gösterilmez; değeri korunur." size="sm" checked={Boolean(field.hidden)} onChange={(event) => set({ hidden: event.target.checked })} />
        </Section>

        {topLevel && (
          <Section title="Görünürlük koşulu">
            <ConditionEditor condition={field.condition} candidates={candidates} error={propertyErrors.condition} onChange={(condition) => set({ condition })} />
          </Section>
        )}

      </fieldset>
    </aside>
  );
};

export default FieldInspector;
