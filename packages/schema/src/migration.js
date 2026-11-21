import { LABEL_LOCALE, isPlainObject, labelOf, newUuid } from "./constants.js";
import { evaluateCondition } from "./conditions.js";
import { getFieldType } from "./fieldTypes.js";
import { checksumOf, flattenFields, stableStringify } from "./schema.js";
import { isEmptyValue, validateFieldValues } from "./values.js";

// Şema farkı ve dry-run (şartname §6.2, §25.3, AT-20, AT-46). Alanlar kimlikle eşlenir; anahtar değişse de veri bağı kopmaz.

// Etki düzeyleri: none (veri taşımaz), compatible (eski veriyle uyumlu), migration (kayıtlar yeniden doğrulanır/dönüştürülür),
// breaking (API sözleşmesi değişir; açık onay gerekir).
const IMPACT_ORDER = ["none", "compatible", "migration", "breaking"];
const maxImpact = (list) => list.reduce((worst, item) => (IMPACT_ORDER.indexOf(item) > IMPACT_ORDER.indexOf(worst) ? item : worst), "none");

const PRESENTATION_SETTINGS = new Set(["counter", "rows", "trueLabel", "falseLabel", "captionEnabled", "displayField"]);
const METADATA_PROPERTIES = ["label", "help", "placeholder", "ui", "searchable", "filterable", "sortable", "condition", "hidden", "permissions", "retainWhenHidden", "publishWhenHidden", "defaultValue"];

const DECIMAL = /^-?\d+(?:\.\d+)?$/;
const one = (list) => (list.length <= 1 ? { value: list[0] ?? null } : null);

/**
 * Tip dönüşümleri (şartname §25.3). Her dönüştürücü { value } veya { error, message } döner.
 * Tanımsız dönüşümde dolu değer dönüştürülemez (TYPE_CHANGE_UNSUPPORTED); boş değer sorun değildir.
 */
const CONVERSIONS = {
  "text>textarea": (value) => ({ value }),
  "textarea>text": (value) => (/[\r\n]/.test(value) ? { error: "MULTILINE_VALUE", message: "Çok satırlı metin tek satıra dönüştürülemez." } : { value }),
  "text>richText": (value) => ({ value: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: value }] }] } }),
  "textarea>richText": (value) => ({ value: { type: "doc", content: value.split(/\r?\n/).map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : [] })) } }),
  "integer>decimal": (value) => ({ value: String(value) }),
  "integer>percentage": (value) => ({ value: String(value) }),
  "decimal>percentage": (value) => ({ value }),
  "percentage>decimal": (value) => ({ value }),
  "decimal>integer": (value) => (DECIMAL.test(value) && !/\.\d*[1-9]/.test(value) ? { value: Number.parseInt(value, 10) } : { error: "FRACTION_LOSS", message: `"${value}" kesirli; tam sayıya dönüştürülürse veri kaybolur.` }),
  "percentage>integer": (value) => (/\.\d*[1-9]/.test(value) ? { error: "FRACTION_LOSS", message: `"${value}" kesirli; tam sayıya dönüştürülürse veri kaybolur.` } : { value: Number.parseInt(value, 10) }),
  "select>multiselect": (value) => ({ value: [value] }),
  "multiselect>select": (value, plan) => one(value) ?? (plan.pick === "first" ? { value: value[0] } : { error: "MULTIPLE_VALUES", message: `${value.length} seçim var; tek seçime dönüştürmek için hangisinin kalacağını seçin.` }),
  "relation>relationList": (value) => ({ value: [value] }),
  "relationList>relation": (value, plan) => one(value) ?? (plan.pick === "first" ? { value: value[0] } : { error: "MULTIPLE_VALUES", message: `${value.length} ilişkili kayıt var; tek ilişkiye dönüştürmek için seçim yapın.` }),
  "image>imageGallery": (value) => ({ value: [{ id: newUuid(), ...value }] }),
  "image>mediaGallery": (value) => ({ value: [{ id: newUuid(), ...value, kind: "image" }] }),
  "video>videoGallery": (value) => ({ value: [{ id: newUuid(), ...value }] }),
  "imageGallery>image": (value, plan) => {
    const strip = ({ id: _rowId, ...rest }) => rest;
    if (value.length <= 1) return { value: value[0] ? strip(value[0]) : null };
    return plan.pick === "first" ? { value: strip(value[0]) } : { error: "MULTIPLE_VALUES", message: `${value.length} görsel var; tek görsele dönüştürmek için seçim yapın.` };
  },
  "videoGallery>video": (value, plan) => {
    const strip = ({ id: _rowId, ...rest }) => rest;
    if (value.length <= 1) return { value: value[0] ? strip(value[0]) : null };
    return plan.pick === "first" ? { value: strip(value[0]) } : { error: "MULTIPLE_VALUES", message: `${value.length} video var; tek videoya dönüştürmek için seçim yapın.` };
  },
  "date>datetime": (value) => ({ value: `${value}T00:00:00Z` }),
  "email>text": (value) => ({ value }),
  "url>text": (value) => ({ value }),
  "phone>text": (value) => ({ value }),
  "slug>text": (value) => ({ value }),
};

export const isConvertible = (fromType, toType) => fromType === toType || Boolean(CONVERSIONS[`${fromType}>${toType}`]);

const diffProperties = (before, after) => {
  const details = [];
  const compare = (property, impact) => {
    if (stableStringify(before[property]) !== stableStringify(after[property])) details.push({ property, from: before[property] ?? null, to: after[property] ?? null, impact });
  };
  METADATA_PROPERTIES.forEach((property) => compare(property, "none"));
  compare("key", "breaking");
  if (before.type !== after.type) details.push({ property: "type", from: before.type, to: after.type, impact: isConvertible(before.type, after.type) ? "migration" : "breaking" });
  compare("localized", "migration");
  if (Boolean(before.required) !== Boolean(after.required)) details.push({ property: "required", from: Boolean(before.required), to: Boolean(after.required), impact: after.required ? "migration" : "compatible" });
  compare("requiredOn", after.required ? "migration" : "none");
  if ((before.unique ?? "none") !== (after.unique ?? "none")) details.push({ property: "unique", from: before.unique ?? "none", to: after.unique ?? "none", impact: (after.unique ?? "none") === "none" ? "compatible" : "migration" });
  compare("nullable", after.nullable === false ? "migration" : "compatible");
  compare("public", "compatible");
  compare("sensitive", "compatible");
  if (before.settings?.targetModule !== after.settings?.targetModule && (before.settings?.targetModule || after.settings?.targetModule)) {
    details.push({ property: "settings.targetModule", from: before.settings?.targetModule ?? null, to: after.settings?.targetModule ?? null, impact: "breaking" });
  }
  const settingKeys = new Set([...Object.keys(before.settings ?? {}), ...Object.keys(after.settings ?? {})]);
  settingKeys.delete("targetModule");
  settingKeys.forEach((key) => {
    if (stableStringify(before.settings?.[key]) !== stableStringify(after.settings?.[key])) {
      details.push({ property: `settings.${key}`, from: before.settings?.[key] ?? null, to: after.settings?.[key] ?? null, impact: PRESENTATION_SETTINGS.has(key) ? "none" : "migration" });
    }
  });
  const blockKeys = (field) => stableStringify((field.blocks ?? []).map((block) => ({ key: block.key, maxItems: block.maxItems ?? null })));
  if (blockKeys(before) !== blockKeys(after)) details.push({ property: "blocks", from: null, to: null, impact: "migration" });
  return details;
};

const keyPathOf = (flat, item) => {
  const keys = [];
  let current = item;
  while (current) {
    keys.unshift(current.field.key);
    const parentId = current.parent?.id;
    current = parentId ? flat.find((candidate) => candidate.field.id === parentId) : null;
  }
  return keys.join(".");
};

/**
 * İki şema arasındaki fark. Her değişikliğin etkisi ve şemanın genel uyumluluğu döner.
 * compatibility: "compatible" | "requiresDryRun" | "breaking".
 */
export const diffSchemas = (base, next) => {
  const changes = [];
  const baseFlat = base ? flattenFields(base.fields) : [];
  const nextFlat = flattenFields(next.fields);
  const baseById = new Map(baseFlat.map((item) => [item.field.id, item]));
  const nextById = new Map(nextFlat.map((item) => [item.field.id, item]));

  nextFlat.forEach((item) => {
    const { field } = item;
    const previous = baseById.get(field.id);
    const common = { fieldId: field.id, key: keyPathOf(nextFlat, item), label: labelOf(field.label), type: field.type };
    if (!previous) {
      const needsData = field.required && (field.defaultValue === undefined || field.defaultValue === null);
      changes.push({ ...common, change: "added", impact: needsData ? "migration" : "compatible", details: [] });
      return;
    }
    if (!previous.field.archived && field.archived) {
      changes.push({ ...common, change: "archived", impact: "compatible", details: [] });
      return;
    }
    if (previous.field.archived && !field.archived) {
      changes.push({ ...common, change: "restored", impact: "compatible", details: [] });
      return;
    }
    const details = diffProperties(previous.field, field);
    const moved = previous.parent?.id !== item.parent?.id;
    if (moved) details.push({ property: "parent", from: previous.parent?.key ?? null, to: item.parent?.key ?? null, impact: "breaking" });
    if (details.length > 0) changes.push({ ...common, change: "modified", impact: maxImpact(details.map((detail) => detail.impact)), details });
  });
  baseFlat.forEach((item) => {
    if (!nextById.has(item.field.id)) {
      changes.push({ fieldId: item.field.id, key: keyPathOf(baseFlat, item), label: labelOf(item.field.label), type: item.field.type, change: "removed", impact: "breaking", details: [] });
    }
  });

  // Alan sırası yalnız görünümü etkiler.
  const order = (schema) => (schema?.fields ?? []).map((field) => field.id).join(",");
  const reordered = Boolean(base) && order(base) !== order(next);
  const sections = [];
  if (base && base.kind !== next.kind) sections.push({ section: "kind", from: base.kind, to: next.kind, impact: "migration" });
  if (base && stableStringify(base.ui) !== stableStringify(next.ui)) sections.push({ section: "ui", impact: "none" });
  if (base && stableStringify(base.behavior) !== stableStringify(next.behavior)) {
    const limitTightened = next.behavior?.maxEntries !== null && next.behavior?.maxEntries !== base.behavior?.maxEntries;
    sections.push({ section: "behavior", impact: limitTightened ? "migration" : "compatible" });
  }
  if (reordered) sections.push({ section: "order", impact: "none" });

  const impact = maxImpact([...changes.map((item) => item.impact), ...sections.map((item) => item.impact)]);
  return {
    changes,
    sections,
    impact,
    compatibility: impact === "breaking" ? "breaking" : impact === "migration" ? "requiresDryRun" : "compatible",
    hasChanges: changes.length > 0 || sections.length > 0,
  };
};

const localeValues = (value) => (isPlainObject(value) ? Object.entries(value).filter(([, item]) => !isEmptyValue(item)) : []);

const convertTopLevel = (baseField, nextField, value, plan, { defaultLocale, locales }) => {
  if (value === undefined) return { value };
  const fromLocalized = Boolean(baseField.localized && getFieldType(baseField.type)?.localizable);
  const toLocalized = Boolean(nextField.localized && getFieldType(nextField.type)?.localizable);
  let current = value;
  const warnings = [];

  // Dil stratejisi değişimi (şartname §25.3): ortak→dile bağlı seçilen dillere kopyalanır; dile bağlı→ortak çatışmada kaynak seçimi gerekir.
  if (fromLocalized && !toLocalized) {
    const present = localeValues(current);
    const distinct = new Set(present.map(([, item]) => stableStringify(item)));
    if (plan.sourceLocale) current = current?.[plan.sourceLocale] ?? null;
    else if (distinct.size <= 1) current = present[0]?.[1] ?? null;
    else return { error: "LOCALE_CONFLICT", message: `Diller farklı değer içeriyor (${present.map(([locale]) => locale).join(", ")}); hangi dilin değerinin kalacağını seçin.` };
    if (distinct.size > 1) warnings.push("LOCALE_VALUES_DROPPED");
  }
  const convertInner = (inner) => {
    if (baseField.type === nextField.type || isEmptyValue(inner)) return { value: inner };
    const converter = CONVERSIONS[`${baseField.type}>${nextField.type}`];
    if (!converter) return { error: "TYPE_CHANGE_UNSUPPORTED", message: `${getFieldType(baseField.type)?.label ?? baseField.type} değeri ${getFieldType(nextField.type)?.label ?? nextField.type} tipine dönüştürülemez.` };
    return converter(inner, plan);
  };
  if (fromLocalized && toLocalized) {
    const out = {};
    for (const [locale, inner] of Object.entries(current ?? {})) {
      const result = convertInner(inner);
      if (result.error) return { ...result, locale };
      out[locale] = result.value;
    }
    return { value: out, warnings };
  }
  const result = convertInner(current);
  if (result.error) return result;
  if (!fromLocalized && toLocalized) {
    const targets = (plan.targetLocales ?? [defaultLocale]).filter((locale) => locales.includes(locale));
    return { value: isEmptyValue(result.value) ? result.value : Object.fromEntries(targets.map((locale) => [locale, result.value])), warnings };
  }
  return { value: result.value, warnings };
};

/** Koşul değerlendirmesi için değerler: dile bağlı alanda varsayılan dilin değeri kullanılır. */
export const conditionValues = (fields, values, defaultLocale = LABEL_LOCALE) => Object.fromEntries(fields.map((field) => {
  const value = values?.[field.id];
  return [field.id, field.localized && isPlainObject(value) ? value[defaultLocale] : value];
}));

const normalizeUnique = (value) => (typeof value === "string" ? value.trim().toLocaleLowerCase("tr-TR") : stableStringify(value));

/**
 * Dry-run: kayıtları yeni şemaya dönüştürür ve doğrular; hiçbir şey yazmaz.
 * entries: [{ id, status: "draft"|"published", values }]; plan: { fields: { [alanKimliği]: { sourceLocale, targetLocales, pick } } }.
 * Dönen converted yalnız sunucu içindir (uygulama adımı); API yanıtına konmaz.
 */
export const dryRunMigration = ({ base, next, entries = [], locales = [LABEL_LOCALE], defaultLocale = locales[0], plan = {}, maxErrors = 100 }) => {
  const diff = diffSchemas(base, next);
  const baseById = new Map((base?.fields ?? []).map((field) => [field.id, field]));
  const titleField = next.fields.find((field) => field.id === next.ui?.list?.titleField);
  const errors = [];
  const warningCounts = new Map();
  const converted = [];
  let changedCount = 0;
  let failedCount = 0;
  let backfilled = 0;
  const addWarning = (fieldId, code, message) => {
    const keyId = `${fieldId}|${code}`;
    const existing = warningCounts.get(keyId);
    if (existing) existing.count += 1;
    else warningCounts.set(keyId, { fieldId, code, message, count: 1 });
  };
  const entryLabel = (entry) => {
    const raw = titleField ? entry.values?.[titleField.id] : null;
    const text = isPlainObject(raw) ? raw[defaultLocale] ?? Object.values(raw)[0] : raw;
    return typeof text === "string" && text ? text : `Kayıt ${entry.id.slice(0, 8)}`;
  };

  entries.forEach((entry) => {
    const values = {};
    const entryErrors = [];
    next.fields.forEach((nextField) => {
      const baseField = baseById.get(nextField.id);
      const fieldPlan = plan.fields?.[nextField.id] ?? {};
      const original = entry.values?.[nextField.id];
      if (!baseField) {
        if (nextField.required && !nextField.archived && nextField.defaultValue !== undefined && nextField.defaultValue !== null) {
          values[nextField.id] = structuredClone(nextField.defaultValue);
          backfilled += 1;
        }
        return;
      }
      const result = convertTopLevel(baseField, nextField, original, fieldPlan, { defaultLocale, locales });
      if (result.error) {
        entryErrors.push({ path: result.locale ? `${nextField.key}.${result.locale}` : nextField.key, fieldId: nextField.id, code: result.error, message: result.message });
        return;
      }
      (result.warnings ?? []).forEach((code) => addWarning(nextField.id, code, "Seçilmeyen dillerin değerleri yeni sürümde kullanılmaz (geçmişte korunur)."));
      if (result.value !== undefined) values[nextField.id] = result.value;
      if (nextField.required && !nextField.archived && isEmptyValue(result.value) && nextField.defaultValue !== undefined && nextField.defaultValue !== null && !nextField.localized) {
        values[nextField.id] = structuredClone(nextField.defaultValue);
        backfilled += 1;
      }
    });
    // Yeni şemada olmayan ama eski veride bulunan değerler (ör. arşivli alan) korunur.
    Object.entries(entry.values ?? {}).forEach(([fieldId, value]) => {
      if (!(fieldId in values) && next.fields.some((field) => field.id === fieldId && field.archived)) values[fieldId] = value;
    });

    if (entryErrors.length === 0) {
      const visibility = conditionValues(next.fields, values, defaultLocale);
      const validation = validateFieldValues(next.fields, values, {
        locales,
        mode: entry.status === "published" ? "publish" : "save",
        isVisible: (field) => evaluateCondition(field.condition, visibility),
      });
      validation.forEach((error) => {
        const field = flattenFields(next.fields).find((item) => item.field.key === error.path.split(".")[0])?.field;
        entryErrors.push({ ...error, fieldId: field?.id ?? null });
      });
    }
    if (entryErrors.length > 0) {
      failedCount += 1;
      entryErrors.forEach((error) => {
        if (errors.length < maxErrors) errors.push({ entryId: entry.id, entryLabel: entryLabel(entry), ...error });
      });
    } else {
      if (stableStringify(values) !== stableStringify(entry.values ?? {})) changedCount += 1;
      converted.push({ id: entry.id, values });
    }
  });

  // Benzersizlik yeni şemaya göre bütün kayıtlarda denetlenir.
  next.fields.filter((field) => !field.archived && field.unique && field.unique !== "none").forEach((field) => {
    const seen = new Map();
    converted.forEach((entry) => {
      const value = entry.values[field.id];
      const scoped = field.unique === "locale" && isPlainObject(value) ? Object.entries(value).map(([locale, item]) => [`${locale}:${normalizeUnique(item)}`, item]) : [[normalizeUnique(value), value]];
      scoped.forEach(([normalized, raw]) => {
        if (isEmptyValue(raw)) return;
        if (seen.has(normalized)) {
          failedCount += 1;
          if (errors.length < maxErrors) errors.push({ entryId: entry.id, entryLabel: entryLabel(entries.find((item) => item.id === entry.id)), path: field.key, fieldId: field.id, code: "DUPLICATE_VALUE", message: "Bu değer başka bir kayıtta da var; benzersizlik açılamaz." });
        } else seen.set(normalized, entry.id);
      });
    });
  });

  if (base && base.kind !== next.kind && next.kind === "singleton" && entries.length > 1) {
    errors.unshift({ entryId: null, entryLabel: null, path: "kind", fieldId: null, code: "TOO_MANY_ENTRIES", message: `Modülde ${entries.length} kayıt var; tek kayıtlı türe dönüştürülemez.` });
  }
  if (next.behavior?.maxEntries && entries.length > next.behavior.maxEntries) {
    errors.unshift({ entryId: null, entryLabel: null, path: "behavior.maxEntries", fieldId: null, code: "TOO_MANY_ENTRIES", message: `Modülde ${entries.length} kayıt var; sınır ${next.behavior.maxEntries} olamaz.` });
  }
  if (diff.changes.some((change) => change.change === "removed")) {
    errors.unshift({ entryId: null, entryLabel: null, path: "fields", fieldId: null, code: "FIELD_REMOVED", message: "Yayınlanmış alan silinmiş; silmek yerine arşivleyin." });
  }

  const blocked = errors.length > 0;
  const configChecksum = checksumOf(next);
  return {
    configChecksum,
    baseChecksum: base ? checksumOf(base) : null,
    counts: { entries: entries.length, changed: changedCount, failed: failedCount, backfilled },
    errors,
    warnings: [...warningCounts.values()],
    diff,
    compatibilityStatus: blocked ? "blocked" : diff.compatibility === "breaking" ? "requiresConfirmation" : "compatible",
    migrationPlanHash: checksumOf({ base: base ? checksumOf(base) : null, next: configChecksum, plan }),
    converted,
  };
};
