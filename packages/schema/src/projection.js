import { isPlainObject } from "./constants.js";
import { evaluateCondition } from "./conditions.js";
import { parseExpression, evaluateExpression } from "./expression.js";
import { getFieldType } from "./fieldTypes.js";
import { conditionValues } from "./migration.js";

// Kimlikle saklanan değerleri anahtarlı yayın görünümüne çevirir (şartname §6, §15.1, §25.2).
// Kurallar: public=false veya hassas alan hiçbir derinlikte çıkmaz; arşivli alan çıkmaz; gizli değer (secret) asla çıkmaz;
// koşulu sağlanmayan alan publishWhenHidden açık değilse çıkmaz; dile bağlı değer istenen dile, yoksa geri dönüş zincirine çözülür.

const resolveLocale = (value, { locale, fallbackLocales }) => {
  if (!isPlainObject(value)) return { value, resolved: null };
  for (const candidate of [locale, ...fallbackLocales]) {
    if (value[candidate] !== undefined) return { value: value[candidate], resolved: candidate };
  }
  return { value: undefined, resolved: null };
};

const projectFields = (fields, values, context, topLevel) => {
  const out = {};
  const visibility = topLevel ? conditionValues(fields, values, context.defaultLocale) : null;
  const keyed = {};
  fields.forEach((field) => {
    if (field.archived || !field.public || field.sensitive || field.type === "secret") return;
    const fieldType = getFieldType(field.type);
    if (!fieldType || fieldType.availability !== "available") return;
    if (topLevel && field.condition && !evaluateCondition(field.condition, visibility) && !field.publishWhenHidden) return;
    if (fieldType.readOnly) return;
    let value = values?.[field.id];
    if (field.localized && fieldType.localizable) {
      const result = resolveLocale(value, context);
      value = result.value;
      if (result.resolved && result.resolved !== context.locale) context.fallbackUsed = true;
    }
    if (value === undefined) return;
    if (fieldType.valueKind === "object" && isPlainObject(value)) value = projectFields(field.fields ?? [], value, context, false);
    if (fieldType.valueKind === "rows" && Array.isArray(value)) value = value.map((row) => ({ id: row.id, ...projectFields(field.fields ?? [], row.values, context, false) }));
    if (fieldType.valueKind === "blocks" && Array.isArray(value)) {
      value = value.map((row) => {
        const block = (field.blocks ?? []).find((item) => item.key === row.type);
        return { id: row.id, type: row.type, ...projectFields(block?.fields ?? [], row.values, context, false) };
      });
    }
    out[field.key] = value;
    keyed[field.key] = value;
  });
  // Hesaplanan alanlar yayın görünümündeki değerlerden türetilir.
  fields.filter((field) => field.type === "computed" && !field.archived && field.public && !field.sensitive).forEach((field) => {
    const parsed = parseExpression(field.settings?.expression ?? "");
    if (!parsed.error) out[field.key] = evaluateExpression(parsed.ast, keyed);
  });
  return out;
};

/** Yayın (delivery) görünümü. Dönen meta: istenen ve çözülen dil, geri dönüş kullanıldı mı. */
export const projectPublic = (schema, values, { locale, defaultLocale, fallbackLocales = [] } = {}) => {
  const context = { locale, defaultLocale, fallbackLocales: [...fallbackLocales, defaultLocale].filter((item, index, list) => item && item !== locale && list.indexOf(item) === index), fallbackUsed: false };
  const data = projectFields(schema.fields, values ?? {}, context, true);
  return { data, meta: { requestedLocale: locale, resolvedLocale: context.fallbackUsed ? defaultLocale : locale, fallbackUsed: context.fallbackUsed } };
};
