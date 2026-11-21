import { getFieldType, isPlainObject, labelOf } from "@wmp/schema";

const plainText = (node) => (isPlainObject(node) ? `${node.text ?? ""}${(node.content ?? []).map(plainText).join(" ")}` : "");

/** Örnek değerin okunur metni (önizleme; gerçek düzenleyiciler müşteri panelindedir). */
export const formatSample = (field, value, locale) => {
  if (value === undefined || value === null || value === "") return "—";
  const fieldType = getFieldType(field.type);
  const inner = field.localized && fieldType?.localizable && isPlainObject(value) ? value[locale] ?? Object.values(value)[0] : value;
  if (inner === undefined || inner === null) return "—";
  const settings = field.settings ?? {};
  switch (fieldType?.valueKind) {
    case "richText": return plainText(inner).trim() || "—";
    case "money": return `${inner.amount} ${inner.currency}`;
    case "boolean": return inner ? settings.trueLabel || "Evet" : settings.falseLabel || "Hayır";
    case "optionId": return labelOf(settings.options?.find((option) => option.id === inner)?.label) || inner;
    case "optionIds": return inner.map((id) => labelOf(settings.options?.find((option) => option.id === id)?.label) || id).join(", ");
    case "dateRange": return `${inner.start} – ${inner.end ?? "…"}`;
    case "asset": return `Dosya · ${inner.alt ?? "açıklamasız"}`;
    case "assetList": return `${inner.length} dosya`;
    case "embed": return `${inner.provider} · ${inner.externalId}`;
    case "link":
    case "button": return `${inner.label ?? "Bağlantı"} → ${inner.url ?? inner.path ?? "kayıt"}`;
    case "entryRef": return "Bağlı kayıt";
    case "entryRefList": return `${inner.length} bağlı kayıt`;
    case "rows": return `${inner.length} satır`;
    case "blocks": return `${inner.length} blok`;
    case "keyValueRows":
    case "specRows": return inner.map((row) => `${row.key}: ${row.value}`).join(" · ");
    case "address": return [inner.line1, inner.city, inner.country].filter(Boolean).join(", ");
    case "geo": return `${inner.lat}, ${inner.lng}`;
    case "openingHours": return `${inner.weekly.filter((day) => !day.closed).length} gün açık`;
    case "object": return `${Object.keys(inner).length} alt değer`;
    case "json": return JSON.stringify(inner);
    default: return String(inner);
  }
};
