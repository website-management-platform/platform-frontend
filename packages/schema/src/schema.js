import {
  FIELD_KEY_PATTERN, FIELD_WIDTHS, FORM_LAYOUTS, LABEL_LOCALE, LIST_VIEWS, MODULE_KINDS, REQUIRED_ON, RESERVED_FIELD_KEYS, SCHEMA_LIMITS,
  UNIQUE_SCOPES, UUID_PATTERN, WORKFLOWS, isPlainObject, labelOf, newUuid,
} from "./constants.js";
import { checkConditionShape, conditionReferences } from "./conditions.js";
import { parseExpression } from "./expression.js";
import { defaultSettings, getFieldType, isTypeUsable } from "./fieldTypes.js";
import { checkSafePattern } from "./regex.js";
import { validateFieldValue } from "./values.js";

// Modül şeması (şartname §6.1). Kaydedilen biçim:
// { kind, fields: [alan], ui: { form: { layout, groups: [{ id, label }] }, list: { view, titleField, subtitleField, imageField, columns, sort, pageSize } },
//   behavior: { allowDuplicate, allowReorder, softDelete, maxEntries } }
// Eski şemalardaki `behavior.workflow` (yalnız "direct") ve alan `permissions` kabul edilir ama kullanılmaz (ADR-056, ADR-057).
// Arayüz başvuruları (titleField, columns, sort, group) alan kimliğiyle (UUID) tutulur; anahtar değişince bozulmaz.

const FIELD_PROPERTIES = [
  "id", "key", "type", "label", "help", "placeholder", "required", "requiredOn", "defaultValue", "localized", "nullable", "readOnly",
  "hidden", "public", "sensitive", "unique", "searchable", "filterable", "sortable", "settings", "ui", "condition", "permissions",
  "archived", "fields", "blocks", "templateFieldId", "retainWhenHidden", "publishWhenHidden",
];

/** Yeni alan; ayarlar tipin varsayılanlarıyla doldurulur. */
export const createField = (typeId, { key, label, ...overrides } = {}) => {
  const fieldType = getFieldType(typeId);
  const field = {
    id: newUuid(),
    key,
    type: typeId,
    label: typeof label === "string" ? { [LABEL_LOCALE]: label } : label ?? { [LABEL_LOCALE]: fieldType?.label ?? typeId },
    required: false,
    requiredOn: "publish",
    localized: false,
    nullable: true,
    readOnly: false,
    hidden: false,
    public: true,
    sensitive: false,
    unique: "none",
    searchable: false,
    filterable: false,
    sortable: false,
    settings: defaultSettings(typeId),
    ui: { width: "full" },
    condition: null,
    archived: false,
    ...overrides,
  };
  if (fieldType?.container === "fields" && !field.fields) field.fields = [];
  if (fieldType?.container === "blocks" && !field.blocks) field.blocks = [];
  return field;
};

export const createEmptySchema = (kind = "collection") => ({
  kind,
  fields: [],
  ui: {
    form: { layout: "single", groups: [] },
    list: { view: kind === "tree" ? "tree" : "table", titleField: null, subtitleField: null, imageField: null, columns: [], sort: [], pageSize: 20 },
  },
  behavior: { allowDuplicate: true, allowReorder: true, softDelete: true, maxEntries: null },
});

/** Bütün alanları (iç içe dahil) yol bilgisiyle dolaşır. */
export const walkFields = (fields, visit, { path = [], depth = 1, parent = null } = {}) => {
  (fields ?? []).forEach((field, index) => {
    const fieldPath = [...path, index];
    visit(field, { path: fieldPath, depth, parent });
    if (Array.isArray(field.fields)) walkFields(field.fields, visit, { path: [...fieldPath, "fields"], depth: depth + 1, parent: field });
    if (Array.isArray(field.blocks)) {
      field.blocks.forEach((block, blockIndex) => walkFields(block.fields, visit, { path: [...fieldPath, "blocks", blockIndex, "fields"], depth: depth + 1, parent: field }));
    }
  });
};

export const flattenFields = (fields) => {
  const list = [];
  walkFields(fields, (field, meta) => list.push({ field, ...meta }));
  return list;
};

export const findField = (fields, fieldId) => flattenFields(fields).find((item) => item.field.id === fieldId)?.field ?? null;

/** Alanı ve bütün alt alanlarını yeni kimliklerle kopyalar (şartname §25.2: kopya yeni UUID). Koşullar kopya içinde yeniden eşlenir. */
export const cloneFieldsWithNewIds = (fields) => {
  const idMap = new Map();
  const copy = (list) => list.map((field) => {
    const next = structuredClone(field);
    next.id = newUuid();
    idMap.set(field.id, next.id);
    delete next.templateFieldId;
    if (Array.isArray(field.fields)) next.fields = copy(field.fields);
    if (Array.isArray(field.blocks)) next.blocks = field.blocks.map((block) => ({ ...block, id: newUuid(), fields: copy(block.fields ?? []) }));
    return next;
  });
  const result = copy(fields);
  const remap = (condition) => {
    if (!condition) return condition;
    if (Array.isArray(condition.all)) return { all: condition.all.map(remap) };
    if (Array.isArray(condition.any)) return { any: condition.any.map(remap) };
    if (condition.not) return { not: remap(condition.not) };
    return { ...condition, field: idMap.get(condition.field) ?? condition.field };
  };
  walkFields(result, (field) => {
    field.condition = remap(field.condition);
  });
  return { fields: result, idMap };
};

export const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isPlainObject(value)) return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value ?? null);
};

// FNV-1a 64 bit; şema sağlama toplamı ve dry-run plan özeti için kararlı, ortamdan bağımsız özet.
export const checksumOf = (value) => {
  let hash = 0xcbf29ce484222325n;
  const text = stableStringify(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
};

const pushError = (errors, path, code, message, fieldId = null) => errors.push({ path, code, message, ...(fieldId ? { fieldId } : {}) });

const checkLabel = (errors, label, path, fieldId) => {
  if (!isPlainObject(label) || typeof label[LABEL_LOCALE] !== "string" || !label[LABEL_LOCALE].trim()) {
    pushError(errors, path, "LABEL_REQUIRED", "Türkçe etiket zorunlu.", fieldId);
    return;
  }
  if (Object.entries(label).some(([locale, text]) => !/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale) || typeof text !== "string" || text.length > SCHEMA_LIMITS.maxLabelLength)) {
    pushError(errors, path, "LABEL_INVALID", `Etiketler en çok ${SCHEMA_LIMITS.maxLabelLength} karakter olabilir.`, fieldId);
  }
};

const checkSettings = (errors, field, basePath, { moduleKeys }) => {
  const fieldType = getFieldType(field.type);
  const settings = field.settings ?? {};
  if (!isPlainObject(settings)) {
    pushError(errors, `${basePath}.settings`, "INVALID", "Ayarlar nesne olmalı.", field.id);
    return;
  }
  const descriptors = new Map(fieldType.settings.map((item) => [item.key, item]));
  Object.keys(settings).forEach((key) => {
    if (!descriptors.has(key)) pushError(errors, `${basePath}.settings.${key}`, "UNKNOWN_SETTING", "Bu tip için tanımlı olmayan ayar.", field.id);
  });
  descriptors.forEach((descriptor, key) => {
    const value = settings[key];
    const path = `${basePath}.settings.${key}`;
    if (value === undefined || value === null || value === "") {
      if (descriptor.required) pushError(errors, path, "REQUIRED", `${descriptor.label} zorunlu.`, field.id);
      return;
    }
    switch (descriptor.kind) {
      case "integer":
      case "number": {
        const valid = descriptor.kind === "integer" ? Number.isSafeInteger(value) : typeof value === "number" && Number.isFinite(value);
        if (!valid || (descriptor.min !== undefined && value < descriptor.min) || (descriptor.max !== undefined && value > descriptor.max)) {
          pushError(errors, path, "OUT_OF_RANGE", `${descriptor.label}${descriptor.min !== undefined ? ` ${descriptor.min}` : ""}${descriptor.max !== undefined ? `–${descriptor.max}` : ""} aralığında ${descriptor.kind === "integer" ? "tam sayı" : "sayı"} olmalı.`, field.id);
        }
        break;
      }
      case "boolean":
        if (typeof value !== "boolean") pushError(errors, path, "INVALID", `${descriptor.label} evet/hayır olmalı.`, field.id);
        break;
      case "text":
      case "date":
        if (typeof value !== "string" || value.length > 200 || (descriptor.pattern && !descriptor.pattern.test(value)) || (descriptor.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value))) {
          pushError(errors, path, "INVALID", `${descriptor.label} geçerli değil.`, field.id);
        }
        break;
      case "pattern": {
        const problem = checkSafePattern(value);
        if (problem) pushError(errors, path, "UNSAFE_PATTERN", problem, field.id);
        break;
      }
      case "multiEnum":
        if (!Array.isArray(value) || value.length === 0 || new Set(value).size !== value.length || value.some((item) => !descriptor.options.includes(item))) {
          pushError(errors, path, "INVALID", `${descriptor.label} için en az bir izinli değer seçin.`, field.id);
        }
        break;
      case "stringList":
        if (!Array.isArray(value) || value.length > 50 || value.some((item) => typeof item !== "string" || (descriptor.itemPattern && !descriptor.itemPattern.test(item))) || (descriptor.required && value.length === 0)) {
          pushError(errors, path, "INVALID", `${descriptor.label} geçerli değil.`, field.id);
        }
        break;
      case "options": {
        if (!Array.isArray(value) || value.length === 0) {
          pushError(errors, path, "OPTIONS_REQUIRED", "En az bir seçenek ekleyin.", field.id);
          break;
        }
        if (value.length > SCHEMA_LIMITS.maxOptions) pushError(errors, path, "TOO_MANY", `En çok ${SCHEMA_LIMITS.maxOptions} seçenek olabilir.`, field.id);
        const ids = new Set();
        value.forEach((option, index) => {
          if (!isPlainObject(option) || typeof option.id !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(option.id) || ids.has(option.id)) {
            pushError(errors, `${path}.${index}.id`, "INVALID", "Seçenek kodu benzersiz olmalı; küçük harf, rakam, tire ve alt çizgi.", field.id);
          }
          ids.add(option?.id);
          checkLabel(errors, option?.label, `${path}.${index}.label`, field.id);
        });
        if (value.every((option) => option?.archived)) pushError(errors, path, "OPTIONS_REQUIRED", "En az bir seçenek arşiv dışında olmalı.", field.id);
        break;
      }
      case "moduleRef":
        if (typeof value !== "string" || !/^[a-z][a-z0-9-]{1,62}$/.test(value)) pushError(errors, path, "INVALID", "Hedef modül seçin.", field.id);
        else if (moduleKeys && !moduleKeys.includes(value)) pushError(errors, path, "BROKEN_RELATION", "Hedef modül bu sitede yok.", field.id);
        break;
      case "expression": {
        const parsed = parseExpression(value);
        if (parsed.error) pushError(errors, path, "INVALID_EXPRESSION", parsed.error, field.id);
        break;
      }
      default:
        break;
    }
  });
  const min = settings.minItems ?? settings.minLength ?? settings.min;
  const max = settings.maxItems ?? settings.maxLength ?? settings.max;
  if (typeof min === "number" && typeof max === "number" && min > max) pushError(errors, `${basePath}.settings`, "RANGE_CONFLICT", "En küçük değer en büyükten fazla olamaz.", field.id);
  if (settings.minDate && settings.maxDate && settings.minDate > settings.maxDate) pushError(errors, `${basePath}.settings`, "RANGE_CONFLICT", "En erken tarih en geçten sonra olamaz.", field.id);
  if (field.type === "link" && settings.allowInternal === false && settings.allowExternal === false) pushError(errors, `${basePath}.settings`, "SETTING_CONFLICT", "Site içi veya dış bağlantıdan en az biri açık olmalı.", field.id);
};

const checkField = (errors, field, path, { context, moduleKeys, locales, depth }) => {
  if (!isPlainObject(field)) {
    pushError(errors, path, "INVALID", "Alan tanımı nesne olmalı.");
    return;
  }
  const fieldId = typeof field.id === "string" ? field.id : null;
  Object.keys(field).forEach((key) => {
    if (!FIELD_PROPERTIES.includes(key)) pushError(errors, `${path}.${key}`, "UNKNOWN_PROPERTY", "Tanınmayan alan özelliği.", fieldId);
  });
  if (!fieldId || !UUID_PATTERN.test(fieldId)) pushError(errors, `${path}.id`, "INVALID_ID", "Alan kimliği UUID olmalı.");
  if (typeof field.key !== "string" || !FIELD_KEY_PATTERN.test(field.key)) {
    pushError(errors, `${path}.key`, "INVALID_KEY", "API anahtarı küçük harfle başlamalı; harf, rakam ve alt çizgi (en çok 64).", fieldId);
  } else if (RESERVED_FIELD_KEYS.has(field.key)) {
    pushError(errors, `${path}.key`, "RESERVED_KEY", `"${field.key}" sistem tarafından kullanılıyor.`, fieldId);
  }
  checkLabel(errors, field.label, `${path}.label`, fieldId);
  ["help", "placeholder"].forEach((key) => {
    if (field[key] !== undefined && field[key] !== null) {
      if (!isPlainObject(field[key]) || Object.values(field[key]).some((text) => typeof text !== "string" || text.length > SCHEMA_LIMITS.maxHelpLength)) {
        pushError(errors, `${path}.${key}`, "INVALID", `En çok ${SCHEMA_LIMITS.maxHelpLength} karakter.`, fieldId);
      }
    }
  });
  const fieldType = getFieldType(field.type);
  if (!fieldType) {
    pushError(errors, `${path}.type`, "UNKNOWN_TYPE", "Bilinmeyen alan tipi; yayınlanamaz.", fieldId);
    return;
  }
  if (!isTypeUsable(field.type, context)) {
    pushError(errors, `${path}.type`, "TYPE_NOT_ALLOWED", fieldType.unavailableReason ?? `${fieldType.label} bu tür şemada kullanılamaz.`, fieldId);
  }
  if (field.required !== undefined && typeof field.required !== "boolean") pushError(errors, `${path}.required`, "INVALID", "Zorunluluk evet/hayır olmalı.", fieldId);
  if (field.requiredOn !== undefined && !REQUIRED_ON.includes(field.requiredOn)) pushError(errors, `${path}.requiredOn`, "INVALID", "Zorunluluk zamanı save veya publish olmalı.", fieldId);
  ["localized", "nullable", "readOnly", "hidden", "public", "sensitive", "searchable", "filterable", "sortable", "archived", "retainWhenHidden", "publishWhenHidden"].forEach((key) => {
    if (field[key] !== undefined && typeof field[key] !== "boolean") pushError(errors, `${path}.${key}`, "INVALID", "Evet/hayır olmalı.", fieldId);
  });
  if (field.unique !== undefined && !UNIQUE_SCOPES.includes(field.unique)) pushError(errors, `${path}.unique`, "INVALID", "Benzersizlik none, site veya locale olmalı.", fieldId);

  // Çelişen ayarlar sunucuda reddedilir (şartname §25.2).
  if (field.localized && !fieldType.localizable) pushError(errors, `${path}.localized`, "NOT_SUPPORTED", `${fieldType.label} dile bağlı olamaz.`, fieldId);
  if (field.unique && field.unique !== "none") {
    if (!fieldType.unique) pushError(errors, `${path}.unique`, "NOT_SUPPORTED", `${fieldType.label} için benzersizlik desteklenmiyor.`, fieldId);
    if (depth > 1) pushError(errors, `${path}.unique`, "NOT_SUPPORTED", "Benzersizlik yalnız üst düzey alanlarda kullanılabilir.", fieldId);
    if (field.unique === "locale" && !field.localized) pushError(errors, `${path}.unique`, "SETTING_CONFLICT", "Dil kapsamlı benzersizlik yalnız dile bağlı alanda kullanılabilir.", fieldId);
  }
  if (field.filterable && !fieldType.filterable) pushError(errors, `${path}.filterable`, "NOT_SUPPORTED", `${fieldType.label} süzgeçte kullanılamaz.`, fieldId);
  if (field.sortable && !fieldType.sortable) pushError(errors, `${path}.sortable`, "NOT_SUPPORTED", `${fieldType.label} sıralamada kullanılamaz.`, fieldId);
  if (field.searchable && !fieldType.searchable) pushError(errors, `${path}.searchable`, "NOT_SUPPORTED", `${fieldType.label} aramada kullanılamaz.`, fieldId);
  if ((field.filterable || field.sortable || field.searchable) && depth > 1) pushError(errors, path, "NOT_SUPPORTED", "Süzme, sıralama ve arama yalnız üst düzey alanlarda kullanılabilir.", fieldId);
  if (field.sensitive && field.public) pushError(errors, `${path}.public`, "SETTING_CONFLICT", "Hassas alan herkese açık yayınlanamaz.", fieldId);
  if (field.publishWhenHidden && !field.public) pushError(errors, `${path}.publishWhenHidden`, "SETTING_CONFLICT", "Gizli (özel) alan yayına çıkamaz.", fieldId);
  if (fieldType.readOnly && (field.required || (field.unique && field.unique !== "none") || field.localized)) {
    pushError(errors, path, "SETTING_CONFLICT", "Hesaplanan alan zorunlu, benzersiz veya dile bağlı olamaz.", fieldId);
  }
  if (field.required && field.readOnly && (field.defaultValue === undefined || field.defaultValue === null)) {
    pushError(errors, `${path}.readOnly`, "SETTING_CONFLICT", "Salt okunur zorunlu alanın varsayılan değeri olmalı.", fieldId);
  }
  if (field.required && field.hidden && !field.condition && (field.defaultValue === undefined || field.defaultValue === null)) {
    pushError(errors, `${path}.hidden`, "SETTING_CONFLICT", "Her zaman gizli olan zorunlu alanın varsayılan değeri olmalı.", fieldId);
  }
  if (field.ui !== undefined && field.ui !== null) {
    if (!isPlainObject(field.ui)) pushError(errors, `${path}.ui`, "INVALID", "Görünüm ayarı nesne olmalı.", fieldId);
    else {
      if (field.ui.width !== undefined && !FIELD_WIDTHS.includes(field.ui.width)) pushError(errors, `${path}.ui.width`, "INVALID", "Genişlik full veya half olmalı.", fieldId);
      if (field.ui.widget !== undefined && !fieldType.widgets.some((widget) => widget.id === field.ui.widget)) pushError(errors, `${path}.ui.widget`, "INVALID", "Bu tip için tanımlı olmayan düzenleyici.", fieldId);
    }
  }
  // Eski şemalardan gelen rol kısıtı (permissions.editRoles) kullanılmaz; yalnız biçimi denetlenir.
  if (field.permissions !== undefined && field.permissions !== null && !isPlainObject(field.permissions)) pushError(errors, `${path}.permissions`, "INVALID", "Alan izinleri nesne olmalı.", fieldId);

  checkSettings(errors, field, path, { moduleKeys });

  if (field.defaultValue !== undefined && field.defaultValue !== null) {
    if (!fieldType.defaultable) pushError(errors, `${path}.defaultValue`, "NOT_SUPPORTED", `${fieldType.label} için varsayılan değer tanımlanamaz.`, fieldId);
    else validateFieldValue({ ...field, required: false }, field.defaultValue, { locales, mode: "save", path: `${path}.defaultValue` })
      .forEach((error) => pushError(errors, error.path, "INVALID_DEFAULT", `Varsayılan değer geçersiz: ${error.message}`, fieldId));
  }

  if (fieldType.container === "fields" && (!Array.isArray(field.fields) || field.fields.filter((child) => !child.archived).length === 0)) {
    pushError(errors, `${path}.fields`, "CHILDREN_REQUIRED", `${fieldType.label} en az bir alt alan içermeli.`, fieldId);
  }
  if (fieldType.container === "blocks") {
    if (!Array.isArray(field.blocks) || field.blocks.length === 0) pushError(errors, `${path}.blocks`, "CHILDREN_REQUIRED", "En az bir blok türü tanımlayın.", fieldId);
    else {
      if (field.blocks.length > SCHEMA_LIMITS.maxBlocks) pushError(errors, `${path}.blocks`, "TOO_MANY", `En çok ${SCHEMA_LIMITS.maxBlocks} blok türü olabilir.`, fieldId);
      const keys = new Set();
      field.blocks.forEach((block, index) => {
        const blockPath = `${path}.blocks.${index}`;
        if (!isPlainObject(block) || typeof block.key !== "string" || !FIELD_KEY_PATTERN.test(block.key) || keys.has(block.key)) {
          pushError(errors, `${blockPath}.key`, "INVALID_KEY", "Blok anahtarı benzersiz ve geçerli olmalı.", fieldId);
        }
        keys.add(block?.key);
        checkLabel(errors, block?.label, `${blockPath}.label`, fieldId);
        if (block?.maxItems !== undefined && block?.maxItems !== null && !(Number.isInteger(block.maxItems) && block.maxItems >= 1 && block.maxItems <= 200)) {
          pushError(errors, `${blockPath}.maxItems`, "OUT_OF_RANGE", "Blok sınırı 1–200 olmalı.", fieldId);
        }
        if (!Array.isArray(block?.fields) || block.fields.length === 0) pushError(errors, `${blockPath}.fields`, "CHILDREN_REQUIRED", "Blok en az bir alan içermeli.", fieldId);
      });
    }
  }
  if (fieldType.container === null && (field.fields !== undefined || field.blocks !== undefined)) {
    pushError(errors, path, "INVALID", "Bu tip alt alan içeremez.", fieldId);
  }
};

const checkSiblingKeys = (errors, fields, path) => {
  const seen = new Map();
  (fields ?? []).forEach((field, index) => {
    if (typeof field?.key !== "string") return;
    if (seen.has(field.key)) pushError(errors, `${path}.${index}.key`, "DUPLICATE_KEY", `"${field.key}" anahtarı bu düzeyde birden çok alanda kullanılıyor.`, field.id);
    seen.set(field.key, index);
  });
};

/**
 * Alan listesinin doğrulaması (şema ve hazır alan grupları ortak kullanır).
 * context: "content" | "integration"; locales: varsayılan değer denetimi için diller; moduleKeys: ilişki hedefleri (verilirse denetlenir).
 */
export const validateFields = (fields, { context = "content", locales = [LABEL_LOCALE], moduleKeys = null, basePath = "fields" } = {}) => {
  const errors = [];
  if (!Array.isArray(fields)) {
    pushError(errors, basePath, "INVALID", "Alan listesi dizi olmalı.");
    return errors;
  }
  const flat = flattenFields(fields);
  if (flat.length > SCHEMA_LIMITS.maxFields) pushError(errors, basePath, "TOO_MANY_FIELDS", `Bir şemada en çok ${SCHEMA_LIMITS.maxFields} alan olabilir.`);
  const ids = new Set();
  const toPath = (segments) => [basePath, ...segments].join(".");
  const checkLevel = (list, segments) => checkSiblingKeys(errors, list, toPath(segments));
  checkLevel(fields, []);
  walkFields(fields, (field, { path, depth }) => {
    const fieldPath = toPath(path);
    if (depth > SCHEMA_LIMITS.maxDepth) pushError(errors, fieldPath, "TOO_DEEP", `Alanlar en çok ${SCHEMA_LIMITS.maxDepth} düzey iç içe olabilir.`, field?.id);
    if (field?.id && ids.has(field.id)) pushError(errors, `${fieldPath}.id`, "DUPLICATE_ID", "Alan kimliği şemada tekrar ediyor.", field.id);
    if (field?.id) ids.add(field.id);
    checkField(errors, field, fieldPath, { context, moduleKeys, locales, depth });
    if (Array.isArray(field?.fields)) checkLevel(field.fields, [...path, "fields"]);
    field?.blocks?.forEach?.((block, blockIndex) => checkLevel(block?.fields, [...path, "blocks", blockIndex, "fields"]));
  });
  return errors;
};

const checkConditionsAndComputed = (errors, fields) => {
  const topLevel = new Map(fields.map((field) => [field.id, field]));
  const byKey = new Map(fields.map((field) => [field.key, field]));
  fields.forEach((field, index) => {
    const path = `fields.${index}`;
    if (field.condition) {
      const shapeError = checkConditionShape(field.condition, { maxRules: SCHEMA_LIMITS.maxConditionRules });
      if (shapeError) pushError(errors, `${path}.condition`, "INVALID_CONDITION", shapeError, field.id);
      else {
        conditionReferences(field.condition).forEach((refId) => {
          const target = topLevel.get(refId);
          if (!target) pushError(errors, `${path}.condition`, "INVALID_REFERENCE", "Koşul var olmayan bir alana bağlı.", field.id);
          else if (target.id === field.id) pushError(errors, `${path}.condition`, "INVALID_REFERENCE", "Alan kendi koşulu olamaz.", field.id);
          else if (target.archived) pushError(errors, `${path}.condition`, "INVALID_REFERENCE", "Koşul arşivlenmiş alana bağlı.", field.id);
          else if (target.sensitive && field.public) pushError(errors, `${path}.condition`, "PERMISSION_CONFLICT", "Herkese açık alanın koşulu hassas bir alana bağlanamaz (değer sızar).", field.id);
        });
      }
    }
  });
  // Koşul döngüsü: A → B → A.
  const graph = new Map(fields.map((field) => [field.id, [...conditionReferences(field.condition)]]));
  const state = new Map();
  const hasCycle = (id) => {
    if (state.get(id) === "visiting") return true;
    if (state.get(id) === "done") return false;
    state.set(id, "visiting");
    const cyclic = (graph.get(id) ?? []).some(hasCycle);
    state.set(id, "done");
    return cyclic;
  };
  fields.forEach((field, index) => {
    if (graph.has(field.id) && hasCycle(field.id)) pushError(errors, `fields.${index}.condition`, "CONDITION_CYCLE", "Koşullar döngü oluşturuyor.", field.id);
  });

  // Hesaplanan alanlar: başvurulan anahtarlar var olmalı, döngü olmamalı.
  const computed = fields.filter((field) => field.type === "computed" && typeof field.settings?.expression === "string");
  const deps = new Map();
  computed.forEach((field) => {
    const parsed = parseExpression(field.settings.expression);
    if (parsed.error) return;
    const index = fields.indexOf(field);
    parsed.references.forEach((key) => {
      const target = byKey.get(key);
      if (!target || target.archived) pushError(errors, `fields.${index}.settings.expression`, "INVALID_REFERENCE", `İfadedeki "${key}" alanı yok.`, field.id);
      else if (target.sensitive && field.public) pushError(errors, `fields.${index}.settings.expression`, "PERMISSION_CONFLICT", `Herkese açık hesaplanan alan hassas "${key}" alanını kullanamaz.`, field.id);
    });
    deps.set(field.key, parsed.references.filter((key) => byKey.get(key)?.type === "computed"));
  });
  const computedState = new Map();
  const computedCycle = (key) => {
    if (computedState.get(key) === "visiting") return true;
    if (computedState.get(key) === "done") return false;
    computedState.set(key, "visiting");
    const cyclic = (deps.get(key) ?? []).some(computedCycle);
    computedState.set(key, "done");
    return cyclic;
  };
  computed.forEach((field) => {
    if (computedCycle(field.key)) pushError(errors, `fields.${fields.indexOf(field)}.settings.expression`, "COMPUTED_CYCLE", "Hesaplanan alanlar birbirine döngüsel bağlı.", field.id);
  });
};

const checkUi = (errors, schema) => {
  const ui = schema.ui;
  if (!isPlainObject(ui) || !isPlainObject(ui.form) || !isPlainObject(ui.list)) {
    pushError(errors, "ui", "INVALID", "Arayüz ayarları (form ve liste) eksik.");
    return;
  }
  const active = new Map(schema.fields.filter((field) => !field.archived).map((field) => [field.id, field]));
  const all = new Map(schema.fields.map((field) => [field.id, field]));
  const refCheck = (fieldId, path, { allowNull = true, predicate = null, message } = {}) => {
    if (fieldId === null || fieldId === undefined) {
      if (!allowNull) pushError(errors, path, "REQUIRED", message ?? "Alan seçin.");
      return;
    }
    if (!all.has(fieldId)) pushError(errors, path, "INVALID_REFERENCE", "Var olmayan alana başvuru.");
    else if (!active.has(fieldId)) pushError(errors, path, "INVALID_REFERENCE", "Arşivlenmiş alan listede kullanılamaz.");
    else if (predicate && !predicate(active.get(fieldId))) pushError(errors, path, "INVALID_REFERENCE", message ?? "Bu alan burada kullanılamaz.");
  };

  if (!FORM_LAYOUTS.includes(ui.form.layout)) pushError(errors, "ui.form.layout", "INVALID", "Form düzeni single veya two-column olmalı.");
  const groups = Array.isArray(ui.form.groups) ? ui.form.groups : [];
  if (!Array.isArray(ui.form.groups)) pushError(errors, "ui.form.groups", "INVALID", "Gruplar dizi olmalı.");
  if (groups.length > SCHEMA_LIMITS.maxGroups) pushError(errors, "ui.form.groups", "TOO_MANY", `En çok ${SCHEMA_LIMITS.maxGroups} grup olabilir.`);
  const groupIds = new Set();
  groups.forEach((group, index) => {
    if (!isPlainObject(group) || typeof group.id !== "string" || !UUID_PATTERN.test(group.id) || groupIds.has(group.id)) pushError(errors, `ui.form.groups.${index}.id`, "INVALID_ID", "Grup kimliği geçersiz.");
    groupIds.add(group?.id);
    checkLabel(errors, group?.label, `ui.form.groups.${index}.label`);
    if (group?.collapsed !== undefined && typeof group.collapsed !== "boolean") pushError(errors, `ui.form.groups.${index}.collapsed`, "INVALID", "Evet/hayır olmalı.");
  });
  schema.fields.forEach((field, index) => {
    if (field.ui?.group && !groupIds.has(field.ui.group)) pushError(errors, `fields.${index}.ui.group`, "INVALID_REFERENCE", "Alan var olmayan bir gruba bağlı.", field.id);
  });

  const list = ui.list;
  if (!LIST_VIEWS.includes(list.view)) pushError(errors, "ui.list.view", "INVALID", "Liste görünümü geçersiz.");
  if (list.view === "tree" && schema.kind !== "tree") pushError(errors, "ui.list.view", "SETTING_CONFLICT", "Ağaç görünümü yalnız ağaç modülde kullanılabilir.");
  const scalar = (field) => ["string", "integer", "decimal", "optionId", "date", "datetime", "computed", "boolean", "money"].includes(getFieldType(field.type)?.valueKind);
  if (schema.kind !== "singleton") {
    refCheck(list.titleField, "ui.list.titleField", { allowNull: false, predicate: scalar, message: "Listede başlık olarak kullanılacak metin veya sayı alanı seçin." });
  }
  refCheck(list.subtitleField, "ui.list.subtitleField", { predicate: scalar, message: "Alt başlık metin veya sayı alanı olmalı." });
  refCheck(list.imageField, "ui.list.imageField", { predicate: (field) => ["image", "imageGallery", "mediaGallery"].includes(field.type), message: "Görsel alanı görsel tipinde olmalı." });
  if (list.view === "gallery" && !list.imageField) pushError(errors, "ui.list.imageField", "REQUIRED", "Galeri görünümü için görsel alanı seçin.");
  if (!Array.isArray(list.columns) || list.columns.length > 8) pushError(errors, "ui.list.columns", "INVALID", "En çok 8 kolon seçilebilir.");
  (list.columns ?? []).forEach((fieldId, index) => refCheck(fieldId, `ui.list.columns.${index}`, { predicate: scalar, message: "Kolon metin, sayı, seçim veya tarih alanı olmalı." }));
  if (!Array.isArray(list.sort) || list.sort.length > 3) pushError(errors, "ui.list.sort", "INVALID", "En çok 3 sıralama tanımlanabilir.");
  (list.sort ?? []).forEach((item, index) => {
    if (!isPlainObject(item) || !["asc", "desc"].includes(item.direction)) pushError(errors, `ui.list.sort.${index}`, "INVALID", "Sıralama yönü asc veya desc olmalı.");
    else if (item.field !== "position" && item.field !== "updatedAt") refCheck(item.field, `ui.list.sort.${index}.field`, { predicate: (field) => field.sortable, message: "Sıralama alanında \"sıralanabilir\" açık olmalı." });
  });
  if (!Number.isInteger(list.pageSize) || list.pageSize < 5 || list.pageSize > 100) pushError(errors, "ui.list.pageSize", "OUT_OF_RANGE", "Sayfa boyutu 5–100 olmalı.");
};

const checkBehavior = (errors, schema) => {
  const behavior = schema.behavior;
  if (!isPlainObject(behavior)) {
    pushError(errors, "behavior", "INVALID", "Davranış ayarları eksik.");
    return;
  }
  const known = ["workflow", "allowDuplicate", "allowReorder", "softDelete", "maxEntries"];
  Object.keys(behavior).forEach((key) => {
    if (!known.includes(key)) pushError(errors, `behavior.${key}`, "UNKNOWN_PROPERTY", "Tanınmayan davranış ayarı.");
  });
  if (behavior.workflow !== undefined && !WORKFLOWS.includes(behavior.workflow)) pushError(errors, "behavior.workflow", "INVALID", "Yayın akışı direct olmalı (inceleme akışı yok, ADR-056).");
  ["allowDuplicate", "allowReorder", "softDelete"].forEach((key) => {
    if (typeof behavior[key] !== "boolean") pushError(errors, `behavior.${key}`, "INVALID", "Evet/hayır olmalı.");
  });
  if (behavior.maxEntries !== null && !(Number.isInteger(behavior.maxEntries) && behavior.maxEntries >= 1 && behavior.maxEntries <= 100000)) {
    pushError(errors, "behavior.maxEntries", "OUT_OF_RANGE", "Kayıt sınırı boş veya 1–100000 olmalı.");
  }
  if (schema.kind === "singleton" && behavior.maxEntries !== null && behavior.maxEntries !== 1) pushError(errors, "behavior.maxEntries", "SETTING_CONFLICT", "Tek kayıtlı modülde sınır 1'dir.");
};

/**
 * Yayın öncesi şema doğrulaması (şartname §6.1, §25.2). Taslak hatalı olabilir; yayın olamaz.
 * options: { locales, moduleKeys (ilişki hedefleri), base (yayındaki şema; silinen alanları yakalamak için), context }.
 */
export const validateSchema = (schema, { locales = [LABEL_LOCALE], moduleKeys = null, base = null, context = "content" } = {}) => {
  const errors = [];
  if (!isPlainObject(schema)) return [{ path: "", code: "INVALID", message: "Şema nesne olmalı." }];
  const size = new TextEncoder().encode(JSON.stringify(schema)).length;
  if (size > SCHEMA_LIMITS.maxSchemaBytes) pushError(errors, "", "TOO_LARGE", "Şema boyutu sınırı aşıyor.");
  Object.keys(schema).forEach((key) => {
    if (!["kind", "fields", "ui", "behavior"].includes(key)) pushError(errors, key, "UNKNOWN_PROPERTY", "Tanınmayan şema özelliği.");
  });
  if (!MODULE_KINDS.includes(schema.kind)) pushError(errors, "kind", "INVALID", "İçerik türü tek kayıt, liste veya ağaç olmalı.");
  errors.push(...validateFields(schema.fields, { context, locales, moduleKeys }));
  if (!Array.isArray(schema.fields)) return errors;
  if (schema.fields.filter((field) => !field?.archived).length === 0) pushError(errors, "fields", "FIELDS_REQUIRED", "En az bir etkin alan ekleyin.");
  checkConditionsAndComputed(errors, schema.fields.filter(isPlainObject));
  checkUi(errors, schema);
  checkBehavior(errors, schema);
  if (base) {
    // Yayınlanmış alan silinemez; önce arşivlenir (şartname §6.2, §25.3).
    const nextIds = new Set(flattenFields(schema.fields).map((item) => item.field?.id));
    flattenFields(base.fields).forEach(({ field }) => {
      if (!nextIds.has(field.id)) pushError(errors, "fields", "FIELD_REMOVED", `"${labelOf(field.label)}" yayınlanmış bir alan; silmek yerine arşivleyin.`, field.id);
    });
  }
  return errors;
};

/** Hata yolundaki alanın kimliği (tasarımcıda hataya tıklayınca alanı seçmek için). */
export const fieldIdAtPath = (schema, path) => {
  const segments = path.split(".");
  if (segments[0] !== "fields") return null;
  let list = schema.fields;
  let found = null;
  for (let index = 1; index < segments.length; index += 1) {
    const position = Number(segments[index]);
    if (!Number.isInteger(position) || !Array.isArray(list)) break;
    found = list[position] ?? null;
    if (segments[index + 1] === "fields") {
      list = found?.fields;
      index += 1;
    } else if (segments[index + 1] === "blocks") {
      list = found?.blocks?.[Number(segments[index + 2])]?.fields;
      index += 3;
    } else break;
  }
  return found?.id ?? null;
};

const remapUi = (ui, idMap) => {
  if (!ui) return ui;
  const map = (id) => (id && idMap.has(id) ? idMap.get(id) : id);
  return {
    form: { ...ui.form, groups: (ui.form?.groups ?? []).map((group) => ({ ...group })) },
    list: {
      ...ui.list,
      titleField: map(ui.list?.titleField),
      subtitleField: map(ui.list?.subtitleField),
      imageField: map(ui.list?.imageField),
      columns: (ui.list?.columns ?? []).map(map),
      sort: (ui.list?.sort ?? []).map((item) => ({ ...item, field: map(item.field) })),
    },
  };
};

/**
 * Şablon sürümünden site modülü şeması üretir: alanlar yeni kimlik alır, templateFieldId şablondaki kimliği tutar
 * (şablon yükseltmesinde eşleme için). Arayüz başvuruları yeni kimliklere çevrilir.
 */
export const instantiateTemplateSchema = (templateSchema) => {
  const source = structuredClone(templateSchema);
  const { fields, idMap } = cloneFieldsWithNewIds(source.fields);
  const reverse = new Map([...idMap].map(([from, to]) => [to, from]));
  walkFields(fields, (field) => {
    field.templateFieldId = reverse.get(field.id);
  });
  return { ...source, fields, ui: remapUi(source.ui, idMap) };
};

/** Bir şemanın bağımsız kopyası (modül veya şablon kopyalama): bütün alan kimlikleri yenilenir, şablon bağı korunur. */
export const copySchema = (schema) => {
  const source = structuredClone(schema);
  const { fields, idMap } = cloneFieldsWithNewIds(source.fields);
  const sourceFlat = flattenFields(source.fields);
  walkFields(fields, (field) => {
    const original = sourceFlat.find((item) => idMap.get(item.field.id) === field.id)?.field;
    if (original?.templateFieldId) field.templateFieldId = original.templateFieldId;
  });
  return { ...source, fields, ui: remapUi(source.ui, idMap) };
};

/**
 * Şablonun yeni sürümünü site modülünün taslağına alır (şartname §6.2: yükseltme her site için açıkça seçilir).
 * Şablon alanı modüldeki eşiyle (templateFieldId) aynı kimliği korur; modüle özel alanlar korunur;
 * şablondan kalkan alanlar silinmez, arşivlenir. Sonuç normal fark ve dry-run akışından geçer.
 */
export const mergeTemplateUpgrade = (instanceSchema, templateSchema) => {
  const instanceFlat = flattenFields(instanceSchema.fields);
  const byTemplateId = new Map(instanceFlat.filter((item) => item.field.templateFieldId).map((item) => [item.field.templateFieldId, item.field]));
  const idMap = new Map();
  const used = new Set();
  const adopt = (list) => list.map((templateField) => {
    const existing = byTemplateId.get(templateField.id);
    const next = structuredClone(templateField);
    next.id = existing?.id ?? newUuid();
    next.templateFieldId = templateField.id;
    idMap.set(templateField.id, next.id);
    if (existing) used.add(existing.id);
    if (Array.isArray(templateField.fields)) {
      const kept = existing?.fields?.filter((child) => !child.templateFieldId) ?? [];
      next.fields = [...adopt(templateField.fields), ...kept];
      kept.forEach((child) => used.add(child.id));
    }
    if (Array.isArray(templateField.blocks)) next.blocks = templateField.blocks.map((block) => ({ ...block, fields: adopt(block.fields ?? []) }));
    return next;
  });
  const fields = adopt(structuredClone(templateSchema.fields));
  const remap = (condition) => {
    if (!condition) return condition;
    if (Array.isArray(condition.all)) return { all: condition.all.map(remap) };
    if (Array.isArray(condition.any)) return { any: condition.any.map(remap) };
    if (condition.not) return { not: remap(condition.not) };
    return { ...condition, field: idMap.get(condition.field) ?? condition.field };
  };
  walkFields(fields, (field) => {
    field.condition = remap(field.condition);
  });
  instanceSchema.fields.forEach((field) => {
    if (used.has(field.id)) return;
    if (!field.templateFieldId) fields.push(structuredClone(field));
    else fields.push({ ...structuredClone(field), archived: true });
  });
  return { ...structuredClone(templateSchema), fields, ui: remapUi(templateSchema.ui, idMap) };
};

/**
 * Geri alma taslağı (şartname §6.2: geri alma yeni değişiklikleri sessizce silmez):
 * hedef sürümün şeması + hedefte olmayan güncel alanlar arşivli olarak eklenir; değerleri korunur.
 */
export const buildRollbackSchema = (targetSchema, currentSchema) => {
  const next = structuredClone(targetSchema);
  const targetIds = new Set(flattenFields(next.fields).map((item) => item.field.id));
  currentSchema.fields.forEach((field) => {
    if (!targetIds.has(field.id)) next.fields.push({ ...structuredClone(field), archived: true });
  });
  return next;
};
