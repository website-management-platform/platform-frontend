import { getFieldType, labelOf } from "@wmp/schema";
import Input from "@/components/Input";
import Select from "@/components/Select";

const STRING_TYPES = new Set(["text", "textarea", "email", "phone", "url", "slug"]);

/**
 * Varsayılan değer (şartname §6). Basit tiplerde düzenlenir; karmaşık ve dile bağlı alanlarda varsayılan değer
 * arayüzden tanımlanmaz (registry'de defaultable=false olanlar backend'de de reddedilir).
 */
const DefaultValueInput = ({ field, onChange, error }) => {
  const fieldType = getFieldType(field.type);
  const value = field.defaultValue;
  const clearable = { optionalText: "İsteğe bağlı" };
  if (!fieldType?.defaultable || field.localized) {
    return <p className="field_inspector_note">{field.localized ? "Dile bağlı alanlarda varsayılan değer tanımlanmaz." : "Bu tip için varsayılan değer tanımlanmaz."}</p>;
  }
  if (STRING_TYPES.has(field.type) || field.type === "decimal" || field.type === "percentage" || field.type === "color" || field.type === "icon") {
    return <Input label="Varsayılan değer" size="sm" value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? undefined : event.target.value)} error={error} {...clearable} />;
  }
  if (field.type === "integer") {
    return <Input label="Varsayılan değer" size="sm" type="number" inputMode="numeric" value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? undefined : Number.parseInt(event.target.value, 10))} error={error} {...clearable} />;
  }
  if (field.type === "date") {
    return <Input label="Varsayılan değer" size="sm" type="date" value={value ?? ""} onChange={(event) => onChange(event.target.value || undefined)} error={error} {...clearable} />;
  }
  if (field.type === "boolean") {
    const options = [{ value: true, label: field.settings?.trueLabel || "Evet" }, { value: false, label: field.settings?.falseLabel || "Hayır" }];
    return <Select label="Varsayılan değer" size="sm" isClearable options={options} value={options.find((option) => option.value === value) ?? null} onChange={(option) => onChange(option?.value)} placeholder="Boş" error={error} />;
  }
  if (field.type === "select" || field.type === "multiselect") {
    const options = (field.settings?.options ?? []).filter((option) => !option.archived).map((option) => ({ value: option.id, label: labelOf(option.label) }));
    if (field.type === "multiselect") {
      return <Select label="Varsayılan seçimler" size="sm" isMulti options={options} value={options.filter((option) => (value ?? []).includes(option.value))} onChange={(selected) => onChange(selected.length ? selected.map((option) => option.value) : undefined)} placeholder="Boş" error={error} />;
    }
    return <Select label="Varsayılan seçim" size="sm" isClearable options={options} value={options.find((option) => option.value === value) ?? null} onChange={(option) => onChange(option?.value)} placeholder="Boş" error={error} />;
  }
  return <p className="field_inspector_note">Bu tipin varsayılan değeri yalnız API ile tanımlanır.</p>;
};

export default DefaultValueInput;
