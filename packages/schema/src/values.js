import { LABEL_LOCALE, UUID_PATTERN, isPlainObject, labelOf } from "./constants.js";
import { getFieldType } from "./fieldTypes.js";

// Alan değerlerinin saklama biçimi ve doğrulaması (şartname §6, AT-06). Değerler alan kimliğiyle (UUID) saklanır:
// grup { altAlanKimliği: değer }, tekrarlanan satır { id, values }, blok { id, type, values }.
// Dile bağlı alan { "tr": değer, "en": değer } biçimindedir. null, eksik ve boş metin birbirinden ayrıdır;
// zorunluluk için boş sayılanlar: eksik, null, "", [] (false ve 0 geçerli değerlerdir).

export const isEmptyValue = (value) => value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const DECIMAL = /^-?\d{1,18}(?:\.\d{1,10})?$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,63}$/;
const E164 = /^\+[1-9]\d{6,14}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const ICON = /^[a-z0-9-]{1,64}$/;
const EMBED_ID = /^[A-Za-z0-9_-]{4,64}$/;
const COUNTRY = /^[A-Z]{2}$/;
const INTERNAL_PATH = /^\/[^\s]{0,500}$/;
// Zengin metin ProseMirror/TipTap JSON biçimindedir. Bağlantı bir işarettir (mark): { type: "text", marks: [{ type: "link", attrs: { href } }] }.
const RICH_TEXT_NODES = new Set(["doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem", "table", "tableRow", "tableCell", "tableHeader", "image", "video", "blockquote", "codeBlock", "hardBreak"]);
const NODE_FAMILY = { heading: "heading", bulletList: "list", orderedList: "list", listItem: "list", table: "table", tableRow: "table", tableCell: "table", tableHeader: "table", image: "image", video: "video", blockquote: "quote", codeBlock: "code" };
const RICH_TEXT_MARKS = new Set(["bold", "italic", "underline", "strike", "code", "link"]);

const isValidDate = (text) => DATE.test(text) && !Number.isNaN(Date.parse(`${text}T00:00:00Z`)) && new Date(`${text}T00:00:00Z`).toISOString().startsWith(text);

const decimalPlaces = (text) => (text.includes(".") ? text.split(".")[1].length : 0);

const urlAllowed = (text, protocols) => {
  try {
    const url = new URL(text);
    return protocols.includes(url.protocol.replace(":", "")) && (url.protocol === "mailto:" || url.protocol === "tel:" || Boolean(url.hostname));
  } catch {
    return false;
  }
};

const textLength = (node) => {
  if (!isPlainObject(node)) return 0;
  return (typeof node.text === "string" ? node.text.length : 0) + (Array.isArray(node.content) ? node.content.reduce((sum, child) => sum + textLength(child), 0) : 0);
};

const checkRichText = (value, settings) => {
  if (!isPlainObject(value) || value.type !== "doc" || !Array.isArray(value.content)) return "Zengin metin { type: \"doc\", content: [] } biçiminde olmalı.";
  const allowed = new Set(settings.allowedNodes ?? []);
  let depthError = null;
  const visit = (node, depth) => {
    if (depthError) return;
    if (depth > 12) {
      depthError = "Zengin metin çok derin.";
      return;
    }
    if (!isPlainObject(node) || !RICH_TEXT_NODES.has(node.type)) {
      depthError = "Zengin metinde izin verilmeyen öğe var.";
      return;
    }
    const family = NODE_FAMILY[node.type];
    if (family && !allowed.has(family)) {
      depthError = `Bu alanda "${family}" öğesine izin verilmiyor.`;
      return;
    }
    for (const mark of node.marks ?? []) {
      if (!isPlainObject(mark) || !RICH_TEXT_MARKS.has(mark.type)) {
        depthError = "Zengin metinde izin verilmeyen biçim var.";
        return;
      }
      if (mark.type === "link") {
        if (!allowed.has("link")) {
          depthError = "Bu alanda bağlantıya izin verilmiyor.";
          return;
        }
        if (!urlAllowed(mark.attrs?.href ?? "", ["https", "http", "mailto", "tel"])) {
          depthError = "Bağlantı adresi geçerli değil.";
          return;
        }
      }
    }
    (node.content ?? []).forEach((child) => visit(child, depth + 1));
  };
  value.content.forEach((child) => visit(child, 1));
  if (depthError) return depthError;
  if (settings.maxLength && textLength(value) > settings.maxLength) return `En çok ${settings.maxLength} karakter yazılabilir.`;
  return null;
};

const checkAsset = (item, settings, { withRowId }) => {
  if (!isPlainObject(item)) return "Medya değeri geçerli değil.";
  if (withRowId && (typeof item.id !== "string" || !UUID_PATTERN.test(item.id))) return "Medya satırının kimliği geçersiz.";
  if (typeof item.assetId !== "string" || !UUID_PATTERN.test(item.assetId)) return "Medya kimliği geçersiz.";
  const known = ["id", "assetId", "alt", "caption", "focalPoint", "crop", "kind"];
  if (Object.keys(item).some((key) => !known.includes(key) || (key === "id" && !withRowId))) return "Medya değerinde tanınmayan alan var.";
  if (item.alt !== undefined && item.alt !== null && (typeof item.alt !== "string" || item.alt.length > 300)) return "Alternatif metin en çok 300 karakter olabilir.";
  if (item.caption !== undefined && item.caption !== null && (typeof item.caption !== "string" || item.caption.length > 500)) return "Açıklama en çok 500 karakter olabilir.";
  if (item.kind !== undefined && !(settings.allowedKinds ?? ["image", "video"]).includes(item.kind)) return "Bu medya türüne izin verilmiyor.";
  if (item.focalPoint !== undefined && !(isPlainObject(item.focalPoint) && [item.focalPoint.x, item.focalPoint.y].every((n) => typeof n === "number" && n >= 0 && n <= 1))) return "Odak noktası 0–1 aralığında olmalı.";
  return null;
};

const countCheck = (list, settings) => {
  if (settings.minItems !== undefined && settings.minItems !== null && list.length > 0 && list.length < settings.minItems) return `En az ${settings.minItems} öğe gerekli.`;
  if (settings.maxItems && list.length > settings.maxItems) return `En çok ${settings.maxItems} öğe eklenebilir.`;
  return null;
};

const uniqueIds = (list) => new Set(list.map((item) => item?.id)).size === list.length;

const checkLink = (value, settings) => {
  if (!isPlainObject(value)) return "Bağlantı değeri geçerli değil.";
  const known = ["label", "kind", "ref", "path", "url", "target", "rel", "variant"];
  if (Object.keys(value).some((key) => !known.includes(key))) return "Bağlantıda tanınmayan alan var.";
  if (value.label !== undefined && value.label !== null && (typeof value.label !== "string" || value.label.length > 120)) return "Bağlantı etiketi en çok 120 karakter olabilir.";
  if (value.target !== undefined && !["_self", "_blank"].includes(value.target)) return "Hedef _self veya _blank olmalı.";
  if (value.rel !== undefined && !(Array.isArray(value.rel) && value.rel.every((item) => ["nofollow", "noopener", "noreferrer", "sponsored", "ugc"].includes(item)))) return "rel değeri izinli değil.";
  if (value.kind === "internal") {
    if (settings.allowInternal === false) return "Site içi bağlantıya izin verilmiyor.";
    const validRef = typeof value.ref === "string" && UUID_PATTERN.test(value.ref);
    const validPath = typeof value.path === "string" && INTERNAL_PATH.test(value.path) && !value.path.startsWith("//");
    if (!validRef && !validPath) return "Site içi bağlantı için kayıt veya / ile başlayan yol seçin.";
    return null;
  }
  if (value.kind === "external") {
    if (settings.allowExternal === false) return "Dış bağlantıya izin verilmiyor.";
    if (typeof value.url !== "string" || !urlAllowed(value.url, settings.allowedProtocols ?? ["https"])) return `Adres ${(settings.allowedProtocols ?? ["https"]).join(", ")} ile başlamalı.`;
    return null;
  }
  return "Bağlantı türü internal veya external olmalı.";
};

const MODULE_KEY = /^[a-z][a-z0-9-]{1,47}$/;
const ANCHOR = /^[a-z][a-z0-9-]{0,63}$/;
const LOCALE_KEY = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;

// İçerik kaynağı (şartname §9 section source mode). Modülün sitede var olması ve türü sunucuda denetlenir.
const checkContentSource = (value, settings) => {
  if (!isPlainObject(value)) return "İçerik kaynağı geçerli değil.";
  if (Object.keys(value).some((key) => !["mode", "module", "entryIds", "limit", "sort"].includes(key))) return "İçerik kaynağında tanınmayan alan var.";
  if (!(settings.modes ?? ["collection", "singleton", "entries"]).includes(value.mode)) return "Kaynak türü izinli değil.";
  if (typeof value.module !== "string" || !MODULE_KEY.test(value.module)) return "Kaynak modülü seçin.";
  if (value.mode === "entries") {
    if (!Array.isArray(value.entryIds) || value.entryIds.length === 0) return "En az bir kayıt seçin.";
    if (value.entryIds.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id)) || new Set(value.entryIds).size !== value.entryIds.length) return "Kayıt seçimi geçersiz.";
    if (value.entryIds.length > (settings.maxItems ?? 50)) return `En çok ${settings.maxItems ?? 50} kayıt seçilebilir.`;
  } else if (value.entryIds !== undefined) return "Elle seçilen kayıtlar yalnız \"seçili kayıtlar\" kaynağında kullanılır.";
  if (value.mode === "collection") {
    if (value.limit !== undefined && !(Number.isInteger(value.limit) && value.limit >= 1 && value.limit <= (settings.maxItems ?? 50))) return `Gösterilecek kayıt sayısı 1–${settings.maxItems ?? 50} olmalı.`;
    if (value.sort !== undefined && !["position", "newest"].includes(value.sort)) return "Sıralama position veya newest olmalı.";
  } else if (value.limit !== undefined || value.sort !== undefined) return "Sayı ve sıralama yalnız modül kaynağında kullanılır.";
  return null;
};

const MENU_KINDS = ["page", "entry", "external", "anchor", "group"];

// Menü ağacı (şartname §9 navigation): iç içe öğeler, derinlik sınırı, tekrarsız kimlik, güvenli bağlantı.
// Hedef sayfa veya kaydın varlığı ve yayın durumu sunucuda denetlenir.
const checkMenuTree = (value, settings) => {
  if (!Array.isArray(value)) return "Menü öğeleri liste olmalı.";
  const ids = new Set();
  let count = 0;
  const walk = (items, depth) => {
    if (depth > (settings.maxDepth ?? 3)) return `Menü en çok ${settings.maxDepth ?? 3} düzey olabilir.`;
    for (const item of items) {
      count += 1;
      if (!isPlainObject(item) || typeof item.id !== "string" || !UUID_PATTERN.test(item.id)) return "Menü öğesi kimliği geçersiz.";
      if (ids.has(item.id)) return "Menü öğesi kimlikleri tekrar ediyor.";
      ids.add(item.id);
      if (Object.keys(item).some((key) => !["id", "kind", "label", "pageId", "entry", "url", "anchor", "newTab", "hidden", "cta", "children"].includes(key))) return "Menü öğesinde tanınmayan alan var.";
      if (!MENU_KINDS.includes(item.kind)) return "Menü öğesi türü geçersiz.";
      if (!isPlainObject(item.label) || Object.keys(item.label).length === 0 || Object.entries(item.label).some(([locale, text]) => !LOCALE_KEY.test(locale) || typeof text !== "string" || text.trim() === "" || text.length > 80)) {
        return "Menü öğesinin etiketi dil başına 1–80 karakter olmalı.";
      }
      if (item.kind === "page" && !(typeof item.pageId === "string" && UUID_PATTERN.test(item.pageId))) return "Menü öğesi için sayfa seçin.";
      if (item.kind === "entry" && !(isPlainObject(item.entry) && MODULE_KEY.test(item.entry.module ?? "") && UUID_PATTERN.test(item.entry.id ?? ""))) return "Menü öğesi için kayıt seçin.";
      if (item.kind === "external" && !(typeof item.url === "string" && urlAllowed(item.url, ["https", "http", "mailto", "tel"]))) return "Dış adres https, http, mailto veya tel ile başlamalı.";
      if (item.kind === "anchor" && !(typeof item.anchor === "string" && ANCHOR.test(item.anchor))) return "Çapa küçük harf, rakam ve tireden oluşmalı.";
      if (item.newTab !== undefined && typeof item.newTab !== "boolean") return "Yeni sekme değeri evet/hayır olmalı.";
      if (item.hidden !== undefined && typeof item.hidden !== "boolean") return "Gizli değeri evet/hayır olmalı.";
      if (item.cta !== undefined && typeof item.cta !== "boolean") return "Öne çıkan değeri evet/hayır olmalı.";
      if (item.children !== undefined) {
        if (!Array.isArray(item.children)) return "Alt öğeler liste olmalı.";
        if (item.kind !== "group" && item.kind !== "page" && item.children.length > 0) return "Alt öğe yalnız grup veya sayfa öğesine eklenebilir.";
        const error = walk(item.children, depth + 1);
        if (error) return error;
      }
    }
    return null;
  };
  const error = walk(value, 1);
  if (error) return error;
  return count > (settings.maxItems ?? 60) ? `Menüde en çok ${settings.maxItems ?? 60} öğe olabilir.` : null;
};

const checkHours = (value, settings) => {
  if (!isPlainObject(value) || !Array.isArray(value.weekly)) return "Çalışma saatleri { weekly: [], exceptions: [] } biçiminde olmalı.";
  const days = new Set();
  for (const item of value.weekly) {
    if (!isPlainObject(item) || !Number.isInteger(item.day) || item.day < 1 || item.day > 7 || days.has(item.day)) return "Her gün (1–7) en çok bir kez yazılabilir.";
    days.add(item.day);
    if (!item.closed && !(TIME.test(item.open ?? "") && TIME.test(item.close ?? ""))) return "Açık günler için açılış ve kapanış saati gerekli.";
  }
  const exceptions = value.exceptions ?? [];
  if (!Array.isArray(exceptions) || (exceptions.length > 0 && settings.allowExceptions === false)) return "İstisna tanımı geçerli değil.";
  if (exceptions.length > 100) return "En çok 100 istisna yazılabilir.";
  for (const item of exceptions) {
    if (!isPlainObject(item) || !isValidDate(item.date ?? "")) return "İstisna tarihi geçerli değil.";
    if (!item.closed && !(TIME.test(item.open ?? "") && TIME.test(item.close ?? ""))) return "Açık istisna günü için saat gerekli.";
  }
  return null;
};

/**
 * Tek bir (dile bağlı olmayan) değerin biçim denetimi. Hata mesajı veya null döner.
 * nested: grup/satır/blok alt alanlarını doğrulamak için validateFieldValues'a geri çağrı.
 */
const checkInner = (field, value, nested) => {
  const fieldType = getFieldType(field.type);
  const settings = field.settings ?? {};
  switch (fieldType.valueKind) {
    case "string": {
      if (typeof value !== "string") return "Metin olmalı.";
      if (field.type === "email") return EMAIL.test(value) && value === value.toLowerCase() ? null : "Geçerli bir e-posta adresi yazın (küçük harfle).";
      if (field.type === "phone") return E164.test(value) ? null : "Telefonu ülke koduyla yazın (ör. +905321234567).";
      if (field.type === "url") return urlAllowed(value, settings.allowedProtocols ?? ["https"]) ? null : `Adres ${(settings.allowedProtocols ?? ["https"]).join(", ")} ile başlamalı.`;
      if (field.type === "slug" && !SLUG.test(value)) return "Yalnız küçük harf, rakam ve tire kullanın.";
      if (settings.minLength && value.length > 0 && value.length < settings.minLength) return `En az ${settings.minLength} karakter yazın.`;
      if (settings.maxLength && value.length > settings.maxLength) return `En çok ${settings.maxLength} karakter yazılabilir.`;
      if (field.type === "text" && /[\r\n]/.test(value)) return "Tek satır olmalı.";
      if (settings.pattern && value.length > 0 && !new RegExp(settings.pattern, "u").test(value)) return "Beklenen biçimde değil.";
      return null;
    }
    case "richText": return checkRichText(value, settings);
    case "integer": {
      if (!Number.isSafeInteger(value)) return "Tam sayı olmalı.";
      if (settings.min !== undefined && settings.min !== null && value < settings.min) return `En küçük değer ${settings.min}.`;
      if (settings.max !== undefined && settings.max !== null && value > settings.max) return `En büyük değer ${settings.max}.`;
      if (settings.step && (value - (settings.min ?? 0)) % settings.step !== 0) return `${settings.step} adımlarla girilmeli.`;
      return null;
    }
    case "decimal": {
      if (typeof value !== "string" || !DECIMAL.test(value)) return "Sayı metin olarak (ör. \"12.50\") gönderilmeli.";
      if (decimalPlaces(value) > (settings.precision ?? 2)) return `En çok ${settings.precision ?? 2} ondalık basamak.`;
      const number = Number(value);
      const min = field.type === "percentage" ? 0 : settings.min;
      const max = field.type === "percentage" ? 100 : settings.max;
      if (min !== undefined && min !== null && number < min) return `En küçük değer ${min}.`;
      if (max !== undefined && max !== null && number > max) return `En büyük değer ${max}.`;
      return null;
    }
    case "money": {
      if (!isPlainObject(value) || Object.keys(value).some((key) => !["amount", "currency"].includes(key))) return "Tutar { amount, currency } biçiminde olmalı.";
      if (typeof value.amount !== "string" || !DECIMAL.test(value.amount) || decimalPlaces(value.amount) > (settings.precision ?? 2)) return "Tutar ondalık metin olmalı (ör. \"1250.00\").";
      if (!(settings.currencies ?? ["TRY"]).includes(value.currency)) return "Para birimi izinli değil.";
      return null;
    }
    case "boolean": return typeof value === "boolean" ? null : "Evet/hayır değeri olmalı.";
    case "optionId": {
      const option = (settings.options ?? []).find((item) => item.id === value);
      if (!option) return "Seçenek bulunamadı.";
      return null;
    }
    case "optionIds": {
      if (!Array.isArray(value) || new Set(value).size !== value.length) return "Seçenek listesi tekrarsız olmalı.";
      if (value.some((id) => !(settings.options ?? []).some((item) => item.id === id))) return "Seçeneklerden biri bulunamadı.";
      return countCheck(value, settings);
    }
    case "date": {
      if (typeof value !== "string" || !isValidDate(value)) return "Tarih YYYY-AA-GG biçiminde olmalı.";
      if (settings.minDate && value < settings.minDate) return `En erken ${settings.minDate}.`;
      if (settings.maxDate && value > settings.maxDate) return `En geç ${settings.maxDate}.`;
      return null;
    }
    case "time": return typeof value === "string" && TIME.test(value) ? null : "Saat SS:DD biçiminde olmalı.";
    case "datetime": return typeof value === "string" && DATETIME.test(value) && !Number.isNaN(Date.parse(value)) ? null : "Tarih-saat ISO 8601 biçiminde ve saat dilimli olmalı.";
    case "dateRange": {
      if (!isPlainObject(value) || Object.keys(value).some((key) => !["start", "end"].includes(key))) return "Aralık { start, end } biçiminde olmalı.";
      if (!isValidDate(value.start ?? "")) return "Başlangıç tarihi geçerli değil.";
      if (value.end === null || value.end === undefined) return settings.allowOpenEnd ? null : "Bitiş tarihi gerekli.";
      if (!isValidDate(value.end)) return "Bitiş tarihi geçerli değil.";
      return value.start <= value.end ? null : "Başlangıç bitişten sonra olamaz.";
    }
    case "asset": return checkAsset(value, settings, { withRowId: false });
    case "assetList": {
      if (!Array.isArray(value)) return "Medya listesi olmalı.";
      for (const item of value) {
        const error = checkAsset(item, settings, { withRowId: true });
        if (error) return error;
      }
      if (!uniqueIds(value)) return "Satır kimlikleri tekrar ediyor.";
      return countCheck(value, settings);
    }
    case "embed": {
      if (!isPlainObject(value) || Object.keys(value).some((key) => !["provider", "externalId", "title"].includes(key))) return "Gömülü video { provider, externalId } biçiminde olmalı.";
      if (!(settings.providers ?? ["youtube", "vimeo"]).includes(value.provider)) return "Sağlayıcı izinli değil.";
      return EMBED_ID.test(value.externalId ?? "") ? null : "Video kimliği geçerli değil.";
    }
    case "link": return checkLink(value, settings);
    case "button": {
      const error = checkLink({ ...value, variant: undefined }, settings);
      if (error) return error;
      if (typeof value.label !== "string" || value.label.trim() === "") return "Düğme etiketi gerekli.";
      return (settings.variants ?? ["primary"]).includes(value.variant) ? null : "Düğme görünümü izinli değil.";
    }
    case "entryRef": return typeof value === "string" && UUID_PATTERN.test(value) ? null : "Kayıt kimliği geçersiz.";
    case "entryRefList": {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !UUID_PATTERN.test(item))) return "Kayıt kimlikleri geçersiz.";
      if (new Set(value).size !== value.length) return "Aynı kayıt iki kez seçilmiş.";
      return countCheck(value, settings);
    }
    case "object": {
      if (!isPlainObject(value)) return "Grup değeri nesne olmalı.";
      return nested(field.fields ?? [], value);
    }
    case "rows": {
      if (!Array.isArray(value)) return "Satır listesi olmalı.";
      for (const row of value) {
        if (!isPlainObject(row) || typeof row.id !== "string" || !UUID_PATTERN.test(row.id) || !isPlainObject(row.values)) return "Satır { id, values } biçiminde olmalı.";
        const error = nested(field.fields ?? [], row.values);
        if (error) return error;
      }
      if (!uniqueIds(value)) return "Satır kimlikleri tekrar ediyor.";
      return countCheck(value, settings);
    }
    case "blocks": {
      if (!Array.isArray(value)) return "Blok listesi olmalı.";
      const counts = {};
      for (const row of value) {
        const block = (field.blocks ?? []).find((item) => item.key === row?.type);
        if (!isPlainObject(row) || typeof row.id !== "string" || !UUID_PATTERN.test(row.id) || !block || !isPlainObject(row.values)) return "Blok türü veya biçimi geçersiz.";
        counts[block.key] = (counts[block.key] ?? 0) + 1;
        if (block.maxItems && counts[block.key] > block.maxItems) return `"${labelOf(block.label)}" bloğundan en çok ${block.maxItems} eklenebilir.`;
        const error = nested(block.fields ?? [], row.values);
        if (error) return error;
      }
      if (!uniqueIds(value)) return "Blok kimlikleri tekrar ediyor.";
      return countCheck(value, settings);
    }
    case "keyValueRows":
    case "specRows": {
      if (!Array.isArray(value)) return "Satır listesi olmalı.";
      for (const row of value) {
        const known = fieldType.valueKind === "specRows" ? ["id", "group", "key", "value"] : ["id", "key", "value"];
        if (!isPlainObject(row) || Object.keys(row).some((key) => !known.includes(key)) || typeof row.id !== "string" || !UUID_PATTERN.test(row.id)) return "Satır biçimi geçersiz.";
        if (typeof row.key !== "string" || row.key.trim() === "" || row.key.length > 120 || typeof row.value !== "string" || row.value.length > 2000) return "Her satırda 120 karaktere kadar ad ve 2000 karaktere kadar değer olmalı.";
        if (row.group !== undefined && row.group !== null && (typeof row.group !== "string" || row.group.length > 120)) return "Grup adı en çok 120 karakter olabilir.";
      }
      if (!uniqueIds(value)) return "Satır kimlikleri tekrar ediyor.";
      if (settings.uniqueKeys && new Set(value.map((row) => row.key.trim().toLocaleLowerCase("tr-TR"))).size !== value.length) return "Anahtarlar benzersiz olmalı.";
      return countCheck(value, settings);
    }
    case "address": {
      const known = ["line1", "line2", "district", "city", "postalCode", "country"];
      if (!isPlainObject(value) || Object.keys(value).some((key) => !known.includes(key))) return "Adres biçimi geçersiz.";
      if (known.some((key) => value[key] !== undefined && value[key] !== null && (typeof value[key] !== "string" || value[key].length > 200))) return "Adres satırları en çok 200 karakter olabilir.";
      if (!value.line1 || !value.city) return "Adres ve şehir gerekli.";
      if (settings.requireCountry !== false && !COUNTRY.test(value.country ?? "")) return "Ülke kodu (ör. TR) gerekli.";
      return null;
    }
    case "geo": {
      if (!isPlainObject(value) || Object.keys(value).some((key) => !["lat", "lng"].includes(key))) return "Koordinat { lat, lng } biçiminde olmalı.";
      if (typeof value.lat !== "number" || value.lat < -90 || value.lat > 90) return "Enlem -90 ile 90 arasında olmalı.";
      return typeof value.lng === "number" && value.lng >= -180 && value.lng <= 180 ? null : "Boylam -180 ile 180 arasında olmalı.";
    }
    case "openingHours": return checkHours(value, settings);
    case "contentSource": return checkContentSource(value, settings);
    case "menuTree": return checkMenuTree(value, settings);
    case "color": {
      if (typeof value !== "string") return "Renk metin olmalı.";
      if ((settings.palette ?? []).length > 0) return settings.palette.includes(value) ? null : "Renk izinli renklerden biri olmalı.";
      return HEX.test(value) ? null : "Renk #RRGGBB biçiminde olmalı.";
    }
    case "icon": return typeof value === "string" && ICON.test(value) ? null : "İkon adı geçerli değil.";
    case "token": return (settings.tokens ?? []).includes(value) ? null : "Yazı stili izinli değil.";
    case "json": {
      const size = new TextEncoder().encode(JSON.stringify(value) ?? "").length;
      return size <= (settings.maxBytes ?? 16384) ? null : `JSON en çok ${settings.maxBytes ?? 16384} bayt olabilir.`;
    }
    case "secret": return typeof value === "string" && value.length <= 4096 ? null : "Gizli değer metin olmalı.";
    default: return "Bu alan tipine değer yazılamaz.";
  }
};

/**
 * Bir alan değerinin doğrulaması. Hata dizisi döner: [{ path, code, message }].
 * options.locales: sitenin dilleri (dile bağlı alanda yalnız bunlar kabul edilir).
 * options.mode: "save" (taslak) | "publish". requiredOn "publish" olan alanlar yalnız yayında zorunludur.
 */
export const validateFieldValue = (field, value, { locales = [LABEL_LOCALE], mode = "publish", path = field.key } = {}) => {
  const fieldType = getFieldType(field.type);
  if (!fieldType) return [{ path, code: "UNKNOWN_TYPE", message: "Bilinmeyen alan tipi." }];
  if (fieldType.readOnly) {
    return value === undefined ? [] : [{ path, code: "READ_ONLY", message: "Hesaplanan alana değer yazılamaz." }];
  }
  const requiredNow = field.required && (mode === "publish" || field.requiredOn === "save");
  const nested = (children, values) => {
    const errors = validateFieldValues(children, values, { locales, mode, pathPrefix: path, nestedScope: true });
    return errors.length > 0 ? errors[0].message : null;
  };
  const checkOne = (inner, innerPath) => {
    if (isEmptyValue(inner)) {
      if (inner === null && !field.nullable && !field.required) return [];
      return requiredNow ? [{ path: innerPath, code: "REQUIRED", message: "Bu alan zorunlu." }] : [];
    }
    const message = checkInner(field, inner, nested);
    return message ? [{ path: innerPath, code: "INVALID_VALUE", message }] : [];
  };

  if (field.localized && fieldType.localizable) {
    if (value === undefined || value === null) return requiredNow ? [{ path, code: "REQUIRED", message: "Bu alan zorunlu." }] : [];
    if (!isPlainObject(value)) return [{ path, code: "INVALID_VALUE", message: "Dile bağlı değer { dil: değer } biçiminde olmalı." }];
    const unknown = Object.keys(value).filter((locale) => !locales.includes(locale));
    if (unknown.length > 0) return [{ path: `${path}.${unknown[0]}`, code: "UNKNOWN_LOCALE", message: "Sitede olmayan dil." }];
    const present = locales.filter((locale) => !isEmptyValue(value[locale]));
    const errors = present.flatMap((locale) => checkOne(value[locale], `${path}.${locale}`));
    if (requiredNow && isEmptyValue(value[locales[0]])) errors.unshift({ path: `${path}.${locales[0]}`, code: "REQUIRED", message: "Varsayılan dilde zorunlu." });
    return errors;
  }
  return checkOne(value, path);
};

/**
 * Alan listesine göre değer nesnesinin doğrulaması (values: alan kimliği → değer).
 * Bilinmeyen anahtar reddedilir; arşivli alanların değeri korunur ama yazılamaz (yalnız mevcut değer kalabilir).
 */
export function validateFieldValues(fields, values, { locales = [LABEL_LOCALE], mode = "publish", pathPrefix = "", nestedScope = false, isVisible = () => true } = {}) {
  if (!isPlainObject(values)) return [{ path: pathPrefix || "values", code: "INVALID_VALUE", message: "Değerler nesne olmalı." }];
  const byId = new Map(fields.map((field) => [field.id, field]));
  const errors = Object.keys(values)
    .filter((id) => !byId.has(id))
    .map((id) => ({ path: pathPrefix ? `${pathPrefix}.${id}` : id, code: "UNKNOWN_FIELD", message: "Şemada olmayan alan." }));
  fields.filter((field) => !field.archived).forEach((field) => {
    const path = pathPrefix ? `${pathPrefix}.${field.key}` : field.key;
    // Görünmeyen alanın zorunluluğu yayını engellemez (şartname §25.2); biçim yine denetlenir.
    const visible = nestedScope || isVisible(field);
    const effective = visible ? field : { ...field, required: false };
    errors.push(...validateFieldValue(effective, values[field.id], { locales, mode, path }));
  });
  return errors;
}

const SAMPLE_TEXT = {
  text: "Örnek metin",
  textarea: "Örnek açıklama metni. Birkaç cümlelik kısa bir özet.",
  email: "ornek@example.test",
  phone: "+905321234567",
  url: "https://example.test",
  slug: "ornek-kayit",
};

const sampleAssetId = "00000000-0000-4000-8000-0000000000a1";
const sampleRowId = (index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;

/** Tasarımcı önizlemesi için örnek değer (gerçek veri yazılmaz). */
export const sampleValue = (field, { locales = [LABEL_LOCALE] } = {}) => {
  const fieldType = getFieldType(field.type);
  if (!fieldType || fieldType.readOnly || fieldType.valueKind === "secret" || fieldType.availability !== "available") return undefined;
  if (field.defaultValue !== undefined && field.defaultValue !== null) return field.defaultValue;
  const settings = field.settings ?? {};
  const inner = (() => {
    switch (fieldType.valueKind) {
      case "string": {
        // Örnek metin alanın uzunluk sınırına uyar; önizleme geçersiz değer göstermez.
        const text = SAMPLE_TEXT[field.type] ?? `Örnek ${labelOf(field.label).toLocaleLowerCase("tr-TR")}`;
        return Number.isInteger(settings.maxLength) ? text.slice(0, settings.maxLength) : text;
      }
      case "richText": return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Örnek biçimli metin." }] }] };
      case "integer": return Math.max(settings.min ?? 1, 1);
      case "decimal": return field.type === "percentage" ? "75" : "12.5";
      case "money": return { amount: "1250.00", currency: (settings.currencies ?? ["TRY"])[0] };
      case "boolean": return true;
      case "optionId": return settings.options?.find((item) => !item.archived)?.id ?? null;
      case "optionIds": return (settings.options ?? []).filter((item) => !item.archived).slice(0, 2).map((item) => item.id);
      case "date": return "2026-11-16";
      case "time": return "09:30";
      case "datetime": return "2026-11-16T09:30:00Z";
      case "dateRange": return { start: "2026-11-16", end: "2026-11-20" };
      case "asset": return { assetId: sampleAssetId, alt: "Örnek görsel açıklaması", caption: null };
      case "assetList": return [0, 1].map((index) => ({ id: sampleRowId(index), assetId: sampleAssetId, alt: `Örnek görsel ${index + 1}`, caption: null }));
      case "embed": return { provider: (settings.providers ?? ["youtube"])[0], externalId: "dQw4w9WgXcQ" };
      case "link": return { label: "Daha fazla bilgi", kind: "external", url: "https://example.test", target: "_self" };
      case "button": return { label: "İletişime geçin", kind: "internal", path: "/iletisim", variant: (settings.variants ?? ["primary"])[0] };
      case "entryRef": return sampleRowId(90);
      case "entryRefList": return [sampleRowId(90), sampleRowId(91)];
      case "object": return Object.fromEntries((field.fields ?? []).map((child) => [child.id, sampleValue(child, { locales })]).filter(([, value]) => value !== undefined));
      case "rows": return [0, 1].map((index) => ({ id: sampleRowId(index), values: Object.fromEntries((field.fields ?? []).map((child) => [child.id, sampleValue(child, { locales })]).filter(([, value]) => value !== undefined)) }));
      case "blocks": return (field.blocks ?? []).slice(0, 2).map((block, index) => ({ id: sampleRowId(index), type: block.key, values: Object.fromEntries((block.fields ?? []).map((child) => [child.id, sampleValue(child, { locales })]).filter(([, value]) => value !== undefined)) }));
      case "keyValueRows": return [{ id: sampleRowId(0), key: "Boyut", value: "120 × 80 cm" }, { id: sampleRowId(1), key: "Ağırlık", value: "12 kg" }];
      case "specRows": return [{ id: sampleRowId(0), group: "Genel", key: "Malzeme", value: "Alüminyum" }];
      case "address": return { line1: "Örnek Mah. Deneme Sk. No: 1", city: "İstanbul", country: "TR" };
      case "geo": return { lat: 41.0082, lng: 28.9784 };
      case "openingHours": return { weekly: [1, 2, 3, 4, 5].map((day) => ({ day, closed: false, open: "09:00", close: "18:00" })).concat([{ day: 6, closed: true }, { day: 7, closed: true }]), exceptions: [] };
      case "color": return settings.palette?.[0] ?? "#0E3B83";
      case "icon": return "star";
      case "token": return settings.tokens?.[0] ?? null;
      case "json": return { ornek: true };
      case "contentSource": return { mode: "collection", module: "haberler", limit: 3, sort: "newest" };
      case "menuTree": return [{ id: sampleRowId(0), kind: "external", label: { [locales[0]]: "Örnek bağlantı" }, url: "https://example.test" }];
      default: return undefined;
    }
  })();
  if (inner === undefined || inner === null) return inner;
  if (field.localized && fieldType.localizable) return Object.fromEntries(locales.map((locale) => [locale, inner]));
  return inner;
};
