import { useMemo, useState } from "react";
import { conditionValues, evaluateCondition, getFieldType, labelOf, projectPublic, sampleValue } from "@wmp/schema";
import Alert from "@/components/Alert";
import Badge from "@/components/Badge";
import Select from "@/components/Select";
import Table from "@/components/Table";
import { cx } from "@/utils/cx";
import { formatSample } from "./format";
import "./schema_preview.scss";


const buildSample = (schema, locales, index) => {
  const values = {};
  schema.fields.filter((field) => !field.archived).forEach((field) => {
    let value = sampleValue(field, { locales });
    if (typeof value === "string" && getFieldType(field.type)?.valueKind === "string" && field.type === "text") value = `${value} ${index + 1}`;
    if (value !== undefined) values[field.id] = value;
  });
  return values;
};

/**
 * Test modu (şartname §25.2, AT-60): örnek veriyle form, liste, dil, rol ve yayın JSON'u önizlemesi.
 * Hiçbir kayıt yazılmaz; örnek değerler tarayıcıda üretilir.
 */
const SchemaPreview = ({ schema, locales, defaultLocale = locales[0], mode = "form" }) => {
  const [locale, setLocale] = useState(defaultLocale);
  const samples = useMemo(() => [0, 1, 2].map((index) => buildSample(schema, locales, index)), [schema, locales]);
  const values = samples[0];
  const visibility = conditionValues(schema.fields, values, defaultLocale);
  const fields = schema.fields.filter((field) => !field.archived && !field.hidden);
  const groups = schema.ui.form.groups ?? [];
  const localeOptions = locales.map((item) => ({ value: item, label: item }));

  const renderField = (field) => {
    const visible = evaluateCondition(field.condition, visibility);
    const readOnly = field.readOnly || getFieldType(field.type)?.readOnly;
    return (
      <div key={field.id} className={cx("schema_preview_field", field.ui?.width === "half" && "schema_preview_field_half", !visible && "schema_preview_field_hidden")}>
        <span className="schema_preview_label">
          {labelOf(field.label, locale)}
          {field.required && <span className="schema_preview_required" aria-label="zorunlu">*</span>}
          {field.localized && <Badge size="sm" variant="info">{locale}</Badge>}
          {readOnly && <Badge size="sm" variant="neutral">Salt okunur</Badge>}
          {!visible && <Badge size="sm" variant="neutral">Koşul sağlanmadı</Badge>}
        </span>
        {field.help?.tr && <span className="schema_preview_help">{field.help.tr}</span>}
        <span className="schema_preview_value">{formatSample(field, values[field.id], locale)}</span>
      </div>
    );
  };

  const controls = (
    <div className="schema_preview_controls">
      <Select label="Dil" size="sm" options={localeOptions} value={localeOptions.find((item) => item.value === locale)} onChange={(item) => setLocale(item?.value ?? defaultLocale)} />
    </div>
  );

  if (mode === "api") {
    const projected = projectPublic(schema, values, { locale, defaultLocale });
    return (
      <div className="schema_preview">
        {controls}
        <p className="schema_preview_note">Web sitesinin yayın API'sinden alacağı örnek yanıt. Yayında olmayan, hassas ve arşivli alanlar yer almaz.</p>
        <pre className="schema_preview_json" tabIndex={0} aria-label="Örnek yayın yanıtı">{JSON.stringify({ data: schema.kind === "singleton" ? projected.data : [projected.data], meta: { ...projected.meta, schemaVersion: "taslak" } }, null, 2)}</pre>
      </div>
    );
  }

  if (mode === "list") {
    const list = schema.ui.list;
    const byId = new Map(schema.fields.map((field) => [field.id, field]));
    const columns = [list.titleField, ...(list.columns ?? [])].filter((id, index, all) => id && byId.has(id) && all.indexOf(id) === index);
    if (schema.kind === "singleton") return <p className="schema_preview_note">Tek kayıtlı bölümde liste yoktur.</p>;
    if (columns.length === 0) return <Alert variant="info" size="compact">Liste önizlemesi için başlık alanı seçin.</Alert>;
    return (
      <div className="schema_preview">
        {controls}
        <Table variant="bordered" caption="Örnek kayıt listesi" hideCaption>
          <thead><tr>{columns.map((id) => <th key={id} scope="col">{labelOf(byId.get(id).label, locale)}</th>)}</tr></thead>
          <tbody>
            {samples.map((sample, index) => (
              <tr key={index}>{columns.map((id) => <td key={id}>{formatSample(byId.get(id), sample[id], locale)}</td>)}</tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  }

  const ungrouped = fields.filter((field) => !groups.some((group) => group.id === field.ui?.group));
  return (
    <div className="schema_preview">
      {controls}
      <p className="schema_preview_note">Müşterinin göreceği form, örnek değerlerle. Bu önizleme kayıt oluşturmaz.</p>
      {fields.length === 0 && <Alert variant="info" size="compact">Önizlenecek alan yok.</Alert>}
      <div className={cx("schema_preview_form", schema.ui.form.layout === "two-column" && "schema_preview_form_two")}>
        {ungrouped.map(renderField)}
      </div>
      {groups.map((group) => {
        const groupFields = fields.filter((field) => field.ui?.group === group.id);
        if (groupFields.length === 0) return null;
        return (
          <section key={group.id} className="schema_preview_group" aria-label={labelOf(group.label, locale)}>
            <h3 className="schema_preview_group_title">{labelOf(group.label, locale)}</h3>
            <div className={cx("schema_preview_form", schema.ui.form.layout === "two-column" && "schema_preview_form_two")}>{groupFields.map(renderField)}</div>
          </section>
        );
      })}
    </div>
  );
};

export default SchemaPreview;
