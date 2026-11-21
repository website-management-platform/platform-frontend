// Alan registry'si (şartname §6). Her tip: aile, değer biçimi, ayar tanımları (platform panelindeki ayar formu bunlardan üretilir),
// yetenekler (dil, benzersizlik, süzme, sıralama, arama), süzgeç operatörleri ve widget seçenekleri.
// Bilinmeyen veya kullanıma kapalı tip yayınlanamaz. Kod çalıştıran tip yoktur; hepsi deklaratiftir.

export const FIELD_FAMILIES = [
  { id: "text", label: "Metin" },
  { id: "number", label: "Sayı" },
  { id: "choice", label: "Seçim" },
  { id: "date", label: "Tarih ve saat" },
  { id: "media", label: "Medya ve dosya" },
  { id: "link", label: "Bağlantı ve ilişki" },
  { id: "structure", label: "Yapı" },
  { id: "location", label: "Konum ve saat" },
  { id: "design", label: "Görünüm" },
  { id: "technical", label: "Teknik" },
];

const s = {
  minLength: { key: "minLength", kind: "integer", label: "En az karakter", min: 0, max: 100000 },
  maxLength: (fallback, max) => ({ key: "maxLength", kind: "integer", label: "En çok karakter", min: 1, max, default: fallback }),
  pattern: { key: "pattern", kind: "pattern", label: "Desen (düzenli ifade)", help: "Güvenli alt küme: geri başvuru, lookaround ve iç içe tekrar kullanılamaz." },
  trim: { key: "trim", kind: "boolean", label: "Baştaki ve sondaki boşlukları sil", default: true },
  counter: { key: "counter", kind: "boolean", label: "Karakter sayacı göster", default: false },
  rows: { key: "rows", kind: "integer", label: "Satır sayısı", min: 2, max: 30, default: 4 },
  min: { key: "min", kind: "number", label: "En küçük değer" },
  max: { key: "max", kind: "number", label: "En büyük değer" },
  step: { key: "step", kind: "number", label: "Adım", min: 0 },
  precision: (fallback) => ({ key: "precision", kind: "integer", label: "Ondalık basamak", min: 0, max: 10, default: fallback }),
  minItems: { key: "minItems", kind: "integer", label: "En az öğe", min: 0, max: 500 },
  maxItems: (fallback, max = 500) => ({ key: "maxItems", kind: "integer", label: "En çok öğe", min: 1, max, default: fallback }),
  options: { key: "options", kind: "options", label: "Seçenekler" },
  maxSizeMb: (fallback, max) => ({ key: "maxSizeMb", kind: "integer", label: "En büyük dosya (MB)", min: 1, max, default: fallback }),
  imageFormats: { key: "allowedFormats", kind: "multiEnum", label: "İzinli biçimler", options: ["jpeg", "png", "webp", "avif", "gif"], default: ["jpeg", "png", "webp", "avif"] },
  altRequired: { key: "altRequiredOnPublish", kind: "boolean", label: "Yayında alternatif metin zorunlu", default: true },
  minWidth: { key: "minWidth", kind: "integer", label: "En az genişlik (px)", min: 1, max: 20000 },
  minHeight: { key: "minHeight", kind: "integer", label: "En az yükseklik (px)", min: 1, max: 20000 },
  aspectRatio: { key: "aspectRatio", kind: "text", label: "En-boy oranı (ör. 16:9)", pattern: /^\d{1,2}:\d{1,2}$/ },
  captionEnabled: { key: "captionEnabled", kind: "boolean", label: "Açıklama (caption) alanı", default: true },
  subtitlesRequired: { key: "subtitlesRequired", kind: "boolean", label: "Yayında altyazı zorunlu", default: false },
  posterRequired: { key: "posterRequired", kind: "boolean", label: "Kapak görseli zorunlu", default: false },
  documentFormats: { key: "allowedFormats", kind: "multiEnum", label: "İzinli biçimler", options: ["pdf", "docx", "xlsx", "pptx", "odt", "ods", "txt", "csv"], default: ["pdf"] },
  fileFormats: { key: "allowedFormats", kind: "multiEnum", label: "İzinli biçimler", options: ["pdf", "docx", "xlsx", "pptx", "odt", "ods", "txt", "csv", "zip"], default: ["pdf", "docx", "xlsx"] },
  protocols: (fallback) => ({ key: "allowedProtocols", kind: "multiEnum", label: "İzinli protokoller", options: ["https", "http", "mailto", "tel"], default: fallback }),
  targetModule: { key: "targetModule", kind: "moduleRef", label: "Hedef modül", required: true },
  displayField: { key: "displayField", kind: "text", label: "Gösterilecek alan anahtarı", pattern: /^[a-z][a-zA-Z0-9_]{0,63}$/ },
};

// Widget, değer biçimini değiştirmeden düzenleyicinin görünüşünü seçer (şartname §25.2). Widget değişikliği migration gerektirmez.
const W = {
  textInput: { id: "input", label: "Tek satır" },
  textarea: { id: "textarea", label: "Çok satır" },
  dropdown: { id: "dropdown", label: "Açılır liste" },
  radio: { id: "radio", label: "Seçenek düğmeleri" },
  chips: { id: "chips", label: "Etiket kutucukları" },
  checkboxes: { id: "checkboxes", label: "Onay kutuları" },
  switch: { id: "switch", label: "Anahtar" },
  checkbox: { id: "checkbox", label: "Onay kutusu" },
  picker: { id: "picker", label: "Seçici" },
  cards: { id: "cards", label: "Kartlar" },
  library: { id: "library", label: "Medya kütüphanesi" },
  dropzone: { id: "dropzone", label: "Sürükle bırak" },
  table: { id: "table", label: "Tablo" },
  stack: { id: "stack", label: "Alt alta" },
};

const TEXT_OPS = ["eq", "ne", "in", "contains", "startsWith", "exists"];
const NUMBER_OPS = ["eq", "ne", "in", "gt", "gte", "lt", "lte", "exists"];
const DATE_OPS = ["eq", "ne", "gt", "gte", "lt", "lte", "exists"];
const CHOICE_OPS = ["eq", "ne", "in", "exists"];
const EXISTS_OPS = ["exists"];

const type = (id, family, label, description, config) => ({
  id,
  family,
  label,
  description,
  valueKind: config.valueKind,
  settings: config.settings ?? [],
  widgets: config.widgets ?? [],
  localizable: config.localizable ?? false,
  unique: config.unique ?? false,
  filterable: config.filterable ?? false,
  sortable: config.sortable ?? false,
  searchable: config.searchable ?? false,
  operators: config.operators ?? EXISTS_OPS,
  container: config.container ?? null,
  multiple: config.multiple ?? false,
  // contexts: hangi şemalarda kullanılabilir. "content" içerik modülleri, "integration" entegrasyon ayarları.
  contexts: config.contexts ?? ["content"],
  availability: config.availability ?? "available",
  unavailableReason: config.unavailableReason ?? null,
  readOnly: config.readOnly ?? false,
  defaultable: config.defaultable ?? true,
});

export const FIELD_TYPE_LIST = [
  type("text", "text", "Kısa metin", "Ad, unvan, başlık gibi tek satırlık metin.", {
    valueKind: "string", settings: [s.minLength, s.maxLength(255, 10000), s.pattern, s.trim, s.counter], widgets: [W.textInput],
    localizable: true, unique: true, filterable: true, sortable: true, searchable: true, operators: TEXT_OPS,
  }),
  type("textarea", "text", "Uzun metin", "Biçimsiz çok satırlı metin; özet, kısa açıklama.", {
    valueKind: "string", settings: [s.minLength, s.maxLength(5000, 100000), s.rows, s.counter], widgets: [W.textarea],
    localizable: true, searchable: true, operators: ["contains", "exists"],
  }),
  type("richText", "text", "Zengin metin", "Başlık, liste, bağlantı, tablo ve görsel içerebilen biçimli metin.", {
    valueKind: "richText",
    settings: [s.maxLength(50000, 500000), { key: "allowedNodes", kind: "multiEnum", label: "İzinli öğeler", options: ["heading", "list", "link", "table", "image", "video", "quote", "code"], default: ["heading", "list", "link", "quote"] }],
    localizable: true, searchable: true, operators: EXISTS_OPS,
  }),
  type("email", "text", "E-posta", "E-posta adresi; küçük harfe çevrilerek saklanır.", {
    valueKind: "string", widgets: [W.textInput], unique: true, filterable: true, sortable: true, operators: TEXT_OPS,
  }),
  type("phone", "text", "Telefon", "Uluslararası biçimde telefon numarası (E.164).", {
    valueKind: "string", settings: [{ key: "defaultCountry", kind: "text", label: "Varsayılan ülke kodu (ör. TR)", pattern: /^[A-Z]{2}$/, default: "TR" }],
    unique: true, filterable: true, operators: TEXT_OPS,
  }),
  type("url", "text", "Web adresi", "Tam web adresi.", {
    valueKind: "string", settings: [s.protocols(["https"])], localizable: true, unique: true, filterable: true, operators: TEXT_OPS,
  }),
  type("slug", "text", "Adres parçası (slug)", "Sayfa adresinde kullanılan kısa ad; küçük harf, rakam ve tire.", {
    valueKind: "string", settings: [s.maxLength(120, 200)], localizable: true, unique: true, filterable: true, sortable: true, operators: TEXT_OPS,
  }),
  type("integer", "number", "Tam sayı", "Adet, yıl, sıra gibi ondalıksız sayı.", {
    valueKind: "integer", settings: [s.min, s.max, s.step], unique: true, filterable: true, sortable: true, operators: NUMBER_OPS,
  }),
  type("decimal", "number", "Ondalıklı sayı", "Ölçü, oran gibi ondalıklı sayı; metin olarak saklanır, yuvarlama yapılmaz.", {
    valueKind: "decimal", settings: [s.min, s.max, s.precision(2)], filterable: true, sortable: true, operators: NUMBER_OPS,
  }),
  type("percentage", "number", "Yüzde", "0 ile 100 arası yüzde değeri.", {
    valueKind: "decimal", settings: [s.precision(1)], filterable: true, sortable: true, operators: NUMBER_OPS,
  }),
  type("money", "number", "Para tutarı", "Tutar ve para birimi; ondalık kayıpsız saklanır (tahsilat yoktur).", {
    valueKind: "money",
    settings: [{ key: "currencies", kind: "multiEnum", label: "Para birimleri", options: ["TRY", "USD", "EUR", "GBP"], default: ["TRY"] }, s.precision(2)],
    filterable: true, sortable: true, operators: NUMBER_OPS,
  }),
  type("boolean", "choice", "Evet / hayır", "Açık veya kapalı tek seçim.", {
    valueKind: "boolean",
    settings: [{ key: "trueLabel", kind: "text", label: "Açık etiketi", default: "Evet" }, { key: "falseLabel", kind: "text", label: "Kapalı etiketi", default: "Hayır" }],
    widgets: [W.switch, W.checkbox], filterable: true, sortable: true, operators: ["eq", "exists"],
  }),
  type("select", "choice", "Tek seçim", "Tanımlı seçeneklerden biri; seçenek kimliği saklanır, etiket değişebilir.", {
    valueKind: "optionId", settings: [s.options], widgets: [W.dropdown, W.radio, W.chips], filterable: true, sortable: true, operators: CHOICE_OPS,
  }),
  type("multiselect", "choice", "Çoklu seçim", "Tanımlı seçeneklerden birden çoğu.", {
    valueKind: "optionIds", settings: [s.options, s.minItems, s.maxItems(null, 200)], widgets: [W.dropdown, W.checkboxes, W.chips],
    filterable: true, operators: CHOICE_OPS, multiple: true,
  }),
  type("date", "date", "Tarih", "Gün, ay, yıl (saat dilimsiz).", {
    valueKind: "date",
    settings: [{ key: "minDate", kind: "date", label: "En erken tarih" }, { key: "maxDate", kind: "date", label: "En geç tarih" }],
    filterable: true, sortable: true, operators: DATE_OPS,
  }),
  type("time", "date", "Saat", "Saat ve dakika.", { valueKind: "time", filterable: true, sortable: true, operators: DATE_OPS }),
  type("datetime", "date", "Tarih ve saat", "Belirli bir an; UTC saklanır, site saat diliminde gösterilir.", {
    valueKind: "datetime", filterable: true, sortable: true, operators: DATE_OPS,
  }),
  type("dateRange", "date", "Tarih aralığı", "Başlangıç ve bitiş tarihi; başlangıç bitişten sonra olamaz.", {
    valueKind: "dateRange", settings: [{ key: "allowOpenEnd", kind: "boolean", label: "Bitişsiz aralığa izin ver", default: false }],
    filterable: true, operators: DATE_OPS,
  }),
  type("image", "media", "Görsel", "Tek görsel; alternatif metin ve açıklama ile.", {
    valueKind: "asset", settings: [s.imageFormats, s.maxSizeMb(10, 50), s.altRequired, s.captionEnabled, s.minWidth, s.minHeight, s.aspectRatio],
    widgets: [W.dropzone, W.library], localizable: true, operators: EXISTS_OPS,
  }),
  type("imageGallery", "media", "Görsel galerisi", "Sıralanabilir birden çok görsel.", {
    valueKind: "assetList", settings: [s.imageFormats, s.maxSizeMb(10, 50), s.altRequired, s.captionEnabled, s.minItems, s.maxItems(20, 200), s.aspectRatio],
    widgets: [W.dropzone, W.library], localizable: true, operators: EXISTS_OPS, multiple: true,
  }),
  type("video", "media", "Video", "Yüklenen video; kapak görseli ve altyazı ile.", {
    valueKind: "asset", settings: [s.maxSizeMb(500, 2048), s.posterRequired, s.subtitlesRequired], widgets: [W.dropzone, W.library], localizable: true, operators: EXISTS_OPS,
  }),
  type("videoGallery", "media", "Video listesi", "Birden çok video.", {
    valueKind: "assetList", settings: [s.maxSizeMb(500, 2048), s.posterRequired, s.subtitlesRequired, s.minItems, s.maxItems(10, 100)],
    widgets: [W.dropzone, W.library], localizable: true, operators: EXISTS_OPS, multiple: true,
  }),
  type("audio", "media", "Ses", "Ses kaydı veya podcast bölümü.", {
    valueKind: "asset", settings: [s.maxSizeMb(100, 1024)], widgets: [W.dropzone, W.library], localizable: true, operators: EXISTS_OPS,
  }),
  type("document", "media", "Belge", "PDF veya ofis belgesi.", {
    valueKind: "asset", settings: [s.documentFormats, s.maxSizeMb(25, 200)], widgets: [W.dropzone, W.library], localizable: true, operators: EXISTS_OPS,
  }),
  type("file", "media", "Dosya", "İzinli türde dosya; ZIP varsayılan olarak kapalıdır.", {
    valueKind: "asset", settings: [s.fileFormats, s.maxSizeMb(25, 200)], widgets: [W.dropzone, W.library], localizable: true, operators: EXISTS_OPS,
  }),
  type("mediaGallery", "media", "Karma medya galerisi", "Görsel ve videoların birlikte sıralandığı galeri.", {
    valueKind: "assetList",
    settings: [{ key: "allowedKinds", kind: "multiEnum", label: "İzinli medya", options: ["image", "video"], default: ["image", "video"] }, s.altRequired, s.minItems, s.maxItems(30, 200)],
    widgets: [W.dropzone, W.library], localizable: true, operators: EXISTS_OPS, multiple: true,
  }),
  type("embed", "media", "Gömülü video", "YouTube veya Vimeo bağlantısı; ham iframe veya script kabul edilmez.", {
    valueKind: "embed", settings: [{ key: "providers", kind: "multiEnum", label: "İzinli sağlayıcılar", options: ["youtube", "vimeo"], default: ["youtube", "vimeo"] }],
    localizable: true, operators: EXISTS_OPS,
  }),
  type("link", "link", "Bağlantı", "Site içi sayfa veya dış adres; etiket ve hedef ile.", {
    valueKind: "link",
    settings: [{ key: "allowInternal", kind: "boolean", label: "Site içi bağlantı", default: true }, { key: "allowExternal", kind: "boolean", label: "Dış bağlantı", default: true }, s.protocols(["https", "mailto", "tel"])],
    localizable: true, operators: EXISTS_OPS,
  }),
  type("button", "link", "Düğme (CTA)", "Bağlantı ve görünüm türü olan eylem düğmesi.", {
    valueKind: "button",
    settings: [{ key: "variants", kind: "multiEnum", label: "Görünümler", options: ["primary", "secondary", "link"], default: ["primary", "secondary"] }, s.protocols(["https", "mailto", "tel"])],
    localizable: true, operators: EXISTS_OPS,
  }),
  type("relation", "link", "İlişki", "Aynı sitedeki başka bir modülden tek kayıt.", {
    valueKind: "entryRef", settings: [s.targetModule, s.displayField], widgets: [W.picker, W.cards], filterable: true, operators: CHOICE_OPS,
  }),
  type("relationList", "link", "Çoklu ilişki", "Başka bir modülden sıralı birden çok kayıt.", {
    valueKind: "entryRefList", settings: [s.targetModule, s.displayField, s.minItems, s.maxItems(20, 50)], widgets: [W.picker, W.cards],
    filterable: true, operators: CHOICE_OPS, multiple: true,
  }),
  type("contentSource", "link", "İçerik kaynağı", "Bir bölümün verisini sitedeki bir modülden alır: modülün kayıtları, tek kayıtlı modül veya elle seçilen kayıtlar.", {
    valueKind: "contentSource",
    settings: [{ key: "modes", kind: "multiEnum", label: "İzinli kaynaklar", options: ["collection", "singleton", "entries"], default: ["collection", "singleton", "entries"] }, s.maxItems(12, 50)],
    operators: EXISTS_OPS, defaultable: false,
  }),
  type("menuTree", "link", "Menü öğeleri", "Sayfa, kayıt, dış adres, çapa ve grup öğelerinden oluşan iç içe menü; etiketler dile göre.", {
    valueKind: "menuTree", settings: [{ key: "maxDepth", kind: "integer", label: "En çok derinlik", min: 1, max: 5, default: 3 }, s.maxItems(60, 200)],
    operators: EXISTS_OPS, multiple: true, defaultable: false,
  }),
  type("object", "structure", "Alan grubu", "Birlikte düzenlenen alt alanlar (ör. adres + koordinat).", {
    valueKind: "object", container: "fields", localizable: false, operators: EXISTS_OPS, defaultable: false,
  }),
  type("repeater", "structure", "Tekrarlanan satırlar", "Aynı alt alanlardan oluşan sıralı satırlar (ör. eğitim geçmişi).", {
    valueKind: "rows", container: "fields", settings: [s.minItems, s.maxItems(20, 500)], widgets: [W.stack, W.table], operators: EXISTS_OPS, multiple: true, defaultable: false,
  }),
  type("unionBlocks", "structure", "Esnek bloklar", "Farklı türde blokların sıralı listesi (ör. metin, görsel, alıntı).", {
    valueKind: "blocks", container: "blocks", settings: [s.minItems, s.maxItems(30, 200)], operators: EXISTS_OPS, multiple: true, defaultable: false,
  }),
  type("keyValue", "structure", "Anahtar–değer listesi", "Etiket ve değer çiftleri (ör. teknik bilgiler).", {
    valueKind: "keyValueRows", settings: [{ key: "uniqueKeys", kind: "boolean", label: "Anahtarlar benzersiz olsun", default: true }, s.maxItems(50, 500)],
    localizable: true, operators: EXISTS_OPS, multiple: true, defaultable: false,
  }),
  type("specificationTable", "structure", "Özellik tablosu", "Gruplanabilir özellik satırları (ör. ürün teknik tablosu).", {
    valueKind: "specRows", settings: [{ key: "grouped", kind: "boolean", label: "Satırlar gruplanabilir", default: true }, s.maxItems(100, 1000)],
    localizable: true, operators: EXISTS_OPS, multiple: true, defaultable: false,
  }),
  type("address", "location", "Adres", "Açık adres, şehir ve ülke.", {
    valueKind: "address", settings: [{ key: "requireCountry", kind: "boolean", label: "Ülke zorunlu", default: true }], operators: EXISTS_OPS, defaultable: false,
  }),
  type("geo", "location", "Koordinat", "Enlem ve boylam.", { valueKind: "geo", operators: EXISTS_OPS, defaultable: false }),
  type("openingHours", "location", "Çalışma saatleri", "Haftalık saatler ve tatil istisnaları.", {
    valueKind: "openingHours", settings: [{ key: "allowExceptions", kind: "boolean", label: "Tarih istisnaları", default: true }], operators: EXISTS_OPS, defaultable: false,
  }),
  type("color", "design", "Renk", "Onaltılık renk kodu veya izinli renk adı.", {
    valueKind: "color", settings: [{ key: "palette", kind: "stringList", label: "İzinli renkler (boşsa serbest #RRGGBB)", itemPattern: /^#[0-9a-fA-F]{6}$/ }],
    filterable: true, operators: CHOICE_OPS,
  }),
  type("icon", "design", "İkon", "İkon kütüphanesinden ad.", { valueKind: "icon", filterable: true, operators: CHOICE_OPS }),
  type("typographyToken", "design", "Yazı stili", "Sitenin tanımladığı yazı stillerinden biri.", {
    valueKind: "token", settings: [{ key: "tokens", kind: "stringList", label: "İzinli stiller", itemPattern: /^[a-z][a-z0-9-]{0,39}$/, required: true }],
    operators: CHOICE_OPS,
  }),
  type("json", "technical", "JSON", "Yapılandırılmış teknik veri; yalnız teknik modüllerde kullanılır.", {
    valueKind: "json", settings: [{ key: "maxBytes", kind: "integer", label: "En büyük boyut (bayt)", min: 2, max: 65536, default: 16384 }], operators: EXISTS_OPS, defaultable: false,
  }),
  type("computed", "technical", "Hesaplanan alan", "Diğer alanlardan türetilen salt okunur değer (concat, coalesce, dört işlem).", {
    valueKind: "computed", settings: [{ key: "expression", kind: "expression", label: "İfade", required: true }], readOnly: true, sortable: true, operators: TEXT_OPS, defaultable: false,
  }),
  type("externalReference", "technical", "Dış kaynak referansı", "İzinli bir dış sistemden salt okunur kayıt.", {
    valueKind: "externalRef", availability: "disabled", unavailableReason: "Bu kurulumda etkin dış kaynak adaptörü yok.", operators: EXISTS_OPS, defaultable: false,
  }),
  type("secret", "technical", "Gizli değer", "Şifrelenmiş saklanan değer; yalnız entegrasyon ayarlarında kullanılır, hiçbir zaman gösterilmez.", {
    valueKind: "secret", contexts: ["integration"], operators: EXISTS_OPS, defaultable: false,
  }),
];

export const FIELD_TYPES = Object.fromEntries(FIELD_TYPE_LIST.map((item) => [item.id, item]));

export const getFieldType = (typeId) => (Object.hasOwn(FIELD_TYPES, typeId) ? FIELD_TYPES[typeId] : null);

export const isTypeUsable = (typeId, context = "content") => {
  const fieldType = getFieldType(typeId);
  return Boolean(fieldType && fieldType.availability === "available" && fieldType.contexts.includes(context));
};

// Ayar varsayılanları; yeni alan oluşturulurken uygulanır.
export const defaultSettings = (typeId) => Object.fromEntries((getFieldType(typeId)?.settings ?? [])
  .filter((setting) => setting.default !== undefined && setting.default !== null)
  .map((setting) => [setting.key, Array.isArray(setting.default) ? [...setting.default] : setting.default]));

// API ve panel için serileştirilebilir registry (RegExp nesneleri kaynak metne çevrilir).
export const serializeFieldType = (fieldType) => ({
  ...fieldType,
  settings: fieldType.settings.map(({ pattern, itemPattern, ...rest }) => ({
    ...rest,
    ...(pattern ? { pattern: pattern.source } : {}),
    ...(itemPattern ? { itemPattern: itemPattern.source } : {}),
  })),
});
