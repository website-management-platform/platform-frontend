import { cloneFieldsWithNewIds, createField, getFieldType, newUuid, walkFields } from "@wmp/schema";

// Tasarımcının şema üzerindeki değişmez (immutable) işlemleri. Alan kimliği taşıma ve sıralamada korunur (şartname §25.2);
// kopya yeni kimlik alır. Yayınlanmış alan silinmez, arşivlenir.

// Alan listesini taşıyan konumlar: üst düzey, grup/satır alt alanları ve blok alanları. target: { fieldId, blockKey } | null.
const mapList = (fields, target, update) => {
  if (!target) return update(fields);
  return fields.map((field) => {
    if (field.id === target.fieldId) {
      if (target.blockKey) return { ...field, blocks: field.blocks.map((block) => (block.key === target.blockKey ? { ...block, fields: update(block.fields ?? []) } : block)) };
      return { ...field, fields: update(field.fields ?? []) };
    }
    const next = { ...field };
    if (Array.isArray(field.fields)) next.fields = mapList(field.fields, target, update);
    if (Array.isArray(field.blocks)) next.blocks = field.blocks.map((block) => ({ ...block, fields: mapList(block.fields ?? [], target, update) }));
    return next;
  });
};

/** Alanın bulunduğu liste ve konumu. */
export const locateField = (fields, fieldId, container = null) => {
  const index = fields.findIndex((field) => field.id === fieldId);
  if (index >= 0) return { container, index, siblings: fields };
  for (const field of fields) {
    if (Array.isArray(field.fields)) {
      const found = locateField(field.fields, fieldId, { fieldId: field.id, blockKey: null });
      if (found) return found;
    }
    for (const block of field.blocks ?? []) {
      const found = locateField(block.fields ?? [], fieldId, { fieldId: field.id, blockKey: block.key });
      if (found) return found;
    }
  }
  return null;
};

export const updateField = (schema, fieldId, patch) => {
  const located = locateField(schema.fields, fieldId);
  if (!located) return schema;
  return {
    ...schema,
    fields: mapList(schema.fields, located.container, (list) => list.map((field) => (field.id === fieldId ? { ...field, ...(typeof patch === "function" ? patch(field) : patch) } : field))),
  };
};

export const insertFields = (schema, newFields, { container = null, afterId = null } = {}) => ({
  ...schema,
  fields: mapList(schema.fields, container, (list) => {
    const index = afterId ? list.findIndex((field) => field.id === afterId) : -1;
    return index >= 0 ? [...list.slice(0, index + 1), ...newFields, ...list.slice(index + 1)] : [...list, ...newFields];
  }),
});

export const moveField = (schema, fieldId, direction) => {
  const located = locateField(schema.fields, fieldId);
  if (!located) return schema;
  const target = located.index + direction;
  if (target < 0 || target >= located.siblings.length) return schema;
  return {
    ...schema,
    fields: mapList(schema.fields, located.container, (list) => {
      const next = [...list];
      [next[located.index], next[target]] = [next[target], next[located.index]];
      return next;
    }),
  };
};

const collectIds = (field) => {
  const ids = new Set();
  walkFields([field], (item) => ids.add(item.id));
  return ids;
};

// Silinen alana yapılan arayüz ve koşul başvuruları da temizlenir.
export const removeField = (schema, fieldId) => {
  const located = locateField(schema.fields, fieldId);
  if (!located) return schema;
  const removed = collectIds(located.siblings[located.index]);
  const clean = (id) => (removed.has(id) ? null : id);
  const list = schema.ui?.list ?? {};
  return {
    ...schema,
    fields: mapList(schema.fields, located.container, (items) => items.filter((field) => field.id !== fieldId)).map((field) => (removed.has(field.condition?.field) ? { ...field, condition: null } : field)),
    ui: {
      ...schema.ui,
      list: {
        ...list,
        titleField: clean(list.titleField),
        subtitleField: clean(list.subtitleField),
        imageField: clean(list.imageField),
        columns: (list.columns ?? []).filter((id) => !removed.has(id)),
        sort: (list.sort ?? []).filter((item) => !removed.has(item.field)),
      },
    },
  };
};

/** Anahtarı kardeşler arasında benzersiz yapar: title → title2 → title3. */
export const uniqueKey = (base, siblings) => {
  const taken = new Set(siblings.map((field) => field.key));
  const safe = base && /^[a-z]/.test(base) ? base.slice(0, 60) : `alan${base ?? ""}`.slice(0, 60);
  if (!taken.has(safe)) return safe;
  let suffix = 2;
  while (taken.has(`${safe}${suffix}`)) suffix += 1;
  return `${safe}${suffix}`;
};

const TURKISH = { ı: "i", ğ: "g", ü: "u", ş: "s", ö: "o", ç: "c", İ: "i" };

/** Etiketten API anahtarı önerisi: "Ad soyad" → adSoyad. */
export const suggestFieldKey = (label) => {
  const words = (label ?? "")
    .replace(/[ıİğüşöç]/g, (char) => TURKISH[char] ?? char)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (words.length === 0) return "";
  const [first, ...rest] = words;
  return [first.toLowerCase(), ...rest.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())].join("").replace(/^[0-9]+/, "");
};

export const siblingsOf = (schema, container) => {
  if (!container) return schema.fields;
  const located = locateField(schema.fields, container.fieldId);
  const parent = located?.siblings[located.index];
  if (!parent) return [];
  return container.blockKey ? parent.blocks?.find((block) => block.key === container.blockKey)?.fields ?? [] : parent.fields ?? [];
};

export const newFieldOfType = (schema, typeId, container) => {
  const fieldType = getFieldType(typeId);
  const key = uniqueKey(suggestFieldKey(fieldType.label) || typeId, siblingsOf(schema, container));
  const field = createField(typeId, { key, label: fieldType.label });
  if (fieldType.container === "fields") field.fields = [createField("text", { key: "baslik", label: "Başlık" })];
  if (fieldType.container === "blocks") {
    field.blocks = [{ id: newUuid(), key: "metin", label: { tr: "Metin" }, maxItems: null, fields: [createField("textarea", { key: "metin", label: "Metin" })] }];
  }
  if (typeId === "select" || typeId === "multiselect") field.settings = { ...field.settings, options: [{ id: "secenek-1", label: { tr: "Seçenek 1" } }, { id: "secenek-2", label: { tr: "Seçenek 2" } }] };
  if (typeId === "computed") field.settings = { expression: "\"\"" };
  return field;
};

/** Alanları yeni kimlik ve çakışmayan anahtarlarla kopyalar (hazır grup, başka şema veya çoğaltma). */
export const copyFieldsInto = (schema, sourceFields, container) => {
  const { fields } = cloneFieldsWithNewIds(sourceFields);
  const siblings = [...siblingsOf(schema, container)];
  return fields.map((field) => {
    const key = uniqueKey(field.key, siblings);
    const next = { ...field, key, archived: false, ui: { ...field.ui, group: container ? undefined : field.ui?.group } };
    if (!next.ui.group) delete next.ui.group;
    siblings.push(next);
    return next;
  });
};

export const duplicateField = (schema, fieldId) => {
  const located = locateField(schema.fields, fieldId);
  if (!located) return { schema, newId: null };
  const original = located.siblings[located.index];
  const [copy] = copyFieldsInto(schema, [original], located.container);
  copy.label = Object.fromEntries(Object.entries(original.label).map(([locale, text]) => [locale, locale === "tr" ? `${text} (kopya)` : text]));
  if (!located.container && original.ui?.group) copy.ui = { ...copy.ui, group: original.ui.group };
  return { schema: insertFields(schema, [copy], { container: located.container, afterId: fieldId }), newId: copy.id };
};

/** Taşıyıcı alanlar (grup, satır, blok) için alt alan eklenebilecek konumlar. */
export const containersOf = (field) => {
  const fieldType = getFieldType(field.type);
  if (fieldType?.container === "fields") return [{ fieldId: field.id, blockKey: null }];
  if (fieldType?.container === "blocks") return (field.blocks ?? []).map((block) => ({ fieldId: field.id, blockKey: block.key }));
  return [];
};

export const fieldIdsIn = (fields) => {
  const ids = new Set();
  walkFields(fields, (field) => ids.add(field.id));
  return ids;
};
