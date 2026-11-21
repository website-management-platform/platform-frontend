import { isPlainObject, newUuid } from "./constants.js";
import { evaluateExpression, parseExpression } from "./expression.js";
import { getFieldType } from "./fieldTypes.js";

// Saklama biçimi (alan kimliğiyle) ile API biçimi (alan anahtarıyla) arasında çeviri (şartname §6.1, ADR-020).
// API biçiminde: grup { altAnahtar: değer }, tekrarlanan satır { id, ...altAnahtarlar }, blok { id, type, ...altAnahtarlar }.
// Arşivli alanlar, gizli değerler (secret) ve hesaplanan alanların saklanmış değeri API'ye çıkmaz.

const visibleFields = (fields) => (fields ?? []).filter((field) => !field.archived && field.type !== "secret");

const innerToApi = (field, value) => {
  const valueKind = getFieldType(field.type)?.valueKind;
  if (value === undefined || value === null) return value;
  if (valueKind === "object" && isPlainObject(value)) return toApiValues(field.fields, value);
  if (valueKind === "rows" && Array.isArray(value)) return value.map((row) => ({ id: row.id, ...toApiValues(field.fields, row.values) }));
  if (valueKind === "blocks" && Array.isArray(value)) {
    return value.map((row) => {
      const block = (field.blocks ?? []).find((item) => item.key === row.type);
      return { id: row.id, type: row.type, ...toApiValues(block?.fields ?? [], row.values) };
    });
  }
  return value;
};

/** Saklanan değerlerden anahtarlı API nesnesi. Hesaplanan alanlar anahtarlı değerlerden türetilir. */
export function toApiValues(fields, stored) {
  const out = {};
  visibleFields(fields).forEach((field) => {
    if (getFieldType(field.type)?.readOnly) return;
    const value = stored?.[field.id];
    if (value === undefined) return;
    const fieldType = getFieldType(field.type);
    out[field.key] = field.localized && fieldType?.localizable && isPlainObject(value)
      ? Object.fromEntries(Object.entries(value).map(([locale, inner]) => [locale, innerToApi(field, inner)]))
      : innerToApi(field, value);
  });
  return out;
}

/** Hesaplanan alanların değerleri (anahtarlı API değerleri üzerinden; dile bağlı değerde verilen dil). */
export const computeValues = (fields, apiValues, locale) => {
  const flat = Object.fromEntries(Object.entries(apiValues).map(([key, value]) => [key, isPlainObject(value) && locale in value ? value[locale] : value]));
  return Object.fromEntries((fields ?? []).filter((field) => field.type === "computed" && !field.archived).map((field) => {
    const parsed = parseExpression(field.settings?.expression ?? "");
    return [field.key, parsed.error ? null : evaluateExpression(parsed.ast, flat)];
  }));
};

const innerFromApi = (field, value, path, errors) => {
  const valueKind = getFieldType(field.type)?.valueKind;
  if (value === undefined || value === null) return value;
  if (valueKind === "object") {
    if (!isPlainObject(value)) return value;
    return fromApiValues(field.fields, value, { path, errors });
  }
  if (valueKind === "rows") {
    if (!Array.isArray(value)) return value;
    return value.map((row, index) => {
      if (!isPlainObject(row)) return row;
      const { id, ...rest } = row;
      return { id: typeof id === "string" ? id : newUuid(), values: fromApiValues(field.fields, rest, { path: `${path}.${index}`, errors }) };
    });
  }
  if (valueKind === "blocks") {
    if (!Array.isArray(value)) return value;
    return value.map((row, index) => {
      if (!isPlainObject(row)) return row;
      const { id, type, ...rest } = row;
      const block = (field.blocks ?? []).find((item) => item.key === type);
      return { id: typeof id === "string" ? id : newUuid(), type, values: block ? fromApiValues(block.fields, rest, { path: `${path}.${index}`, errors }) : {} };
    });
  }
  return value;
};

/**
 * Anahtarlı API değerlerini saklama biçimine çevirir. Bilinmeyen, arşivli, gizli değer ve hesaplanan alan anahtarları
 * errors'a UNKNOWN_FIELD / READ_ONLY olarak eklenir (şartname §15: unknown keys rejected).
 */
export function fromApiValues(fields, input, { path = "", errors = [] } = {}) {
  const byKey = new Map(visibleFields(fields).map((field) => [field.key, field]));
  const out = {};
  Object.entries(input ?? {}).forEach(([key, value]) => {
    const fieldPath = path ? `${path}.${key}` : key;
    const field = byKey.get(key);
    if (!field) {
      errors.push({ path: fieldPath, code: "UNKNOWN_FIELD", message: "Şemada olmayan alan." });
      return;
    }
    if (getFieldType(field.type)?.readOnly) {
      errors.push({ path: fieldPath, code: "READ_ONLY", message: "Hesaplanan alana değer yazılamaz." });
      return;
    }
    const fieldType = getFieldType(field.type);
    out[field.id] = field.localized && fieldType?.localizable && isPlainObject(value)
      ? Object.fromEntries(Object.entries(value).map(([locale, inner]) => [locale, innerFromApi(field, inner, `${fieldPath}.${locale}`, errors)]))
      : innerFromApi(field, value, fieldPath, errors);
  });
  return out;
}

/** Saklama hatası yolunu (alan anahtarlarıyla) değiştirmeden döndürür; validateFieldValues zaten anahtar yolu üretir. */
export const fieldByKey = (fields, key) => (fields ?? []).find((field) => field.key === key) ?? null;
