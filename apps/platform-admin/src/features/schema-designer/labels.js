import {
  FiAlignLeft, FiAtSign, FiBox, FiCalendar, FiCheckSquare, FiClock, FiCode, FiCopy, FiCpu, FiDollarSign, FiDroplet, FiEdit3, FiFile,
  FiFilm, FiGrid, FiHash, FiImage, FiKey, FiLayers, FiLink, FiList, FiMapPin, FiMic, FiMousePointer, FiNavigation, FiPercent,
  FiPhone, FiRepeat, FiShare2, FiSliders, FiSmile, FiTable, FiToggleRight, FiType, FiVideo, FiWatch, FiYoutube,
} from "react-icons/fi";

// Tasarımcı metinleri ve simgeleri. Platform paneli teknik kullanıcıya hitap eder; terimler yine de Türkçe ve açıklamalıdır.

export const KIND_OPTIONS = [
  { value: "collection", label: "Liste", description: "Birden çok kayıt (ekip, haber, hizmet). Müşteri kayıt listesini görür." },
  { value: "singleton", label: "Tek kayıt", description: "Tek bir içerik (hakkımızda, site ayarları). Müşteri doğrudan düzenleme ekranına gider." },
  { value: "tree", label: "Ağaç", description: "Hiyerarşik kayıtlar (kategori ağacı). Sürükle bırak ve klavyeyle sıralanır." },
];

export const KIND_LABELS = Object.fromEntries(KIND_OPTIONS.map((item) => [item.value, item.label]));

export const LIST_VIEW_OPTIONS = [
  { value: "table", label: "Tablo" },
  { value: "cards", label: "Kartlar" },
  { value: "compact", label: "Kompakt" },
  { value: "gallery", label: "Galeri" },
  { value: "tree", label: "Ağaç" },
];

export const UNIQUE_OPTIONS = [
  { value: "none", label: "Yok" },
  { value: "site", label: "Bölüm genelinde" },
  { value: "locale", label: "Her dilde ayrı" },
];

export const REQUIRED_ON_OPTIONS = [
  { value: "publish", label: "Yayınlarken" },
  { value: "save", label: "Her kayıtta" },
];

export const WIDTH_OPTIONS = [
  { value: "full", label: "Tam genişlik" },
  { value: "half", label: "Yarım genişlik" },
];

export const OPERATOR_LABELS = {
  eq: "eşittir",
  ne: "eşit değildir",
  in: "şunlardan biri",
  exists: "dolu",
  gt: "büyüktür",
  gte: "büyük veya eşit",
  lt: "küçüktür",
  lte: "küçük veya eşit",
};

export const CHANGE_LABELS = {
  added: "Eklendi",
  removed: "Silindi",
  archived: "Arşivlendi",
  restored: "Arşivden çıktı",
  modified: "Değişti",
};

export const IMPACT_META = {
  none: { label: "Veri etkilenmez", variant: "neutral" },
  compatible: { label: "Uyumlu", variant: "success" },
  migration: { label: "Kayıtlar denetlenir", variant: "warning" },
  breaking: { label: "API'yi bozar", variant: "danger" },
};

export const PROPERTY_LABELS = {
  label: "Etiket",
  help: "Yardım metni",
  placeholder: "Yer tutucu",
  ui: "Görünüm",
  searchable: "Aranabilir",
  filterable: "Süzülebilir",
  sortable: "Sıralanabilir",
  condition: "Görünürlük koşulu",
  hidden: "Gizli",
  permissions: "Düzenleme yetkisi",
  defaultValue: "Varsayılan değer",
  key: "API anahtarı",
  type: "Tip",
  localized: "Dil stratejisi",
  required: "Zorunluluk",
  requiredOn: "Zorunluluk zamanı",
  unique: "Benzersizlik",
  nullable: "Boş değer",
  public: "Yayında görünürlük",
  sensitive: "Hassas veri",
  blocks: "Blok türleri",
  parent: "Konum",
  retainWhenHidden: "Gizlenince değeri koru",
  publishWhenHidden: "Gizliyken yayınla",
  "settings.targetModule": "İlişki hedefi",
};

export const SECTION_LABELS = {
  kind: "İçerik türü",
  ui: "Liste ve form düzeni",
  behavior: "Davranış",
  order: "Alan sırası",
};

export const DRY_RUN_ERROR_HINTS = {
  LOCALE_CONFLICT: "Dillerin değerleri farklı. Ortak değere hangi dilin değerinin geçeceğini seçin.",
  MULTIPLE_VALUES: "Kayıtta birden çok değer var. İlk değerin korunmasını seçebilirsiniz.",
  FRACTION_LOSS: "Kesirli değer tam sayıya dönüştürülemez. Tipi değiştirmeyin ya da kayıtları önce düzeltin.",
  TYPE_CHANGE_UNSUPPORTED: "Bu tip dönüşümü otomatik yapılamaz. Yeni bir alan ekleyip eskisini arşivleyin.",
  REQUIRED: "Yayındaki kayıtta bu alan boş. Varsayılan değer tanımlayın veya zorunluluğu kaldırın.",
  DUPLICATE_VALUE: "Aynı değer birden çok kayıtta var; benzersizlik açılamaz.",
  TOO_MANY_ENTRIES: "Kayıt sayısı yeni sınıra sığmıyor.",
  MULTILINE_VALUE: "Çok satırlı metin tek satıra sığmıyor.",
};

const TYPE_ICONS = {
  text: FiType, textarea: FiAlignLeft, richText: FiEdit3, email: FiAtSign, phone: FiPhone, url: FiLink, slug: FiNavigation,
  integer: FiHash, decimal: FiHash, percentage: FiPercent, money: FiDollarSign, boolean: FiToggleRight, select: FiList, multiselect: FiCheckSquare,
  date: FiCalendar, time: FiClock, datetime: FiWatch, dateRange: FiCalendar, image: FiImage, imageGallery: FiGrid, video: FiVideo, videoGallery: FiFilm,
  audio: FiMic, document: FiFile, file: FiFile, mediaGallery: FiLayers, embed: FiYoutube, link: FiShare2, button: FiMousePointer, relation: FiLink,
  relationList: FiLink, object: FiBox, repeater: FiRepeat, unionBlocks: FiLayers, keyValue: FiTable, specificationTable: FiTable, address: FiMapPin,
  geo: FiMapPin, openingHours: FiClock, color: FiDroplet, icon: FiSmile, typographyToken: FiType, json: FiCode, computed: FiCpu,
  externalReference: FiSliders, secret: FiKey,
};

export const fieldTypeIcon = (typeId) => TYPE_ICONS[typeId] ?? FiCopy;


// Çoklu seçim ayarlarının değer etiketleri (registry değerleri teknik kısaltmadır).
export const SETTING_OPTION_LABELS = {
  heading: "Başlık", list: "Liste", link: "Bağlantı", table: "Tablo", image: "Görsel", video: "Video", quote: "Alıntı", code: "Kod",
  https: "https", http: "http", mailto: "E-posta (mailto)", tel: "Telefon (tel)", youtube: "YouTube", vimeo: "Vimeo",
  primary: "Birincil", secondary: "İkincil", jpeg: "JPEG", png: "PNG", webp: "WebP", avif: "AVIF", gif: "GIF",
  pdf: "PDF", docx: "Word", xlsx: "Excel", pptx: "PowerPoint", odt: "ODT", ods: "ODS", txt: "Metin", csv: "CSV", zip: "ZIP",
  TRY: "TRY", USD: "USD", EUR: "EUR", GBP: "GBP",
};
