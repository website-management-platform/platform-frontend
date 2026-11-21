// Şema sınırları ve anahtar kuralları (şartname §6). Backend aynı değerleri uygular: docs/backend/05-schema.md §2.
export const FIELD_KEY_PATTERN = /^[a-z][a-zA-Z0-9_]{0,63}$/;
export const INSTANCE_KEY_PATTERN = /^[a-z][a-z0-9-]{1,62}$/;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;

export const RESERVED_FIELD_KEYS = new Set([
  "id", "meta", "tenantId", "siteId", "__proto__", "constructor", "prototype",
  "position", "parentId", "status", "createdAt", "updatedAt", "createdBy", "updatedBy",
  "publishedAt", "version", "locale", "schemaVersion", "revision",
]);

export const SCHEMA_LIMITS = {
  maxFields: 200,
  maxDepth: 4,
  maxLabelLength: 120,
  maxHelpLength: 500,
  maxOptions: 200,
  maxBlocks: 20,
  maxGroups: 30,
  maxConditionRules: 10,
  maxPatternLength: 200,
  maxSchemaBytes: 256 * 1024,
};

export const MODULE_KINDS = ["singleton", "collection", "tree"];
export const LIST_VIEWS = ["table", "cards", "compact", "gallery", "tree"];
// Yayın akışı: yalnız doğrudan yayın. İnceleme/onay akışı sade modelde yoktur (ADR-056).
export const WORKFLOWS = ["direct"];
export const FORM_LAYOUTS = ["single", "two-column"];
export const FIELD_WIDTHS = ["full", "half"];
export const UNIQUE_SCOPES = ["none", "site", "locale"];
export const REQUIRED_ON = ["save", "publish"];

// Şemada etiket varsayılan panel dilinde (tr) zorunludur; diğer diller isteğe bağlıdır.
export const LABEL_LOCALE = "tr";

export const labelOf = (label, locale = LABEL_LOCALE) => {
  if (!label) return "";
  if (typeof label === "string") return label;
  return label[locale] || label[LABEL_LOCALE] || Object.values(label).find(Boolean) || "";
};

export const newUuid = () => globalThis.crypto.randomUUID();

export const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
