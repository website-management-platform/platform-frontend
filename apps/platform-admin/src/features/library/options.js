// Kütüphane formlarının ortak seçenekleri.
export const ICON_OPTIONS = [
  "box", "settings", "image", "info", "users", "briefcase", "folder", "file-text", "bell", "calendar", "help-circle", "file", "map-pin",
  "award", "layers", "clock", "bar-chart", "star", "book", "heart", "globe", "shopping-bag", "video", "mic", "layout", "menu", "corner-up-right", "message-circle",
].map((value) => ({ value, label: value }));

const TURKISH = { ı: "i", ğ: "g", ü: "u", ş: "s", ö: "o", ç: "c", İ: "i" };

/** Addan kütüphane anahtarı önerisi: "Yönetim Kurulu" → yonetim-kurulu (küçük harfle başlar). */
export const suggestLibraryKey = (text) => (text ?? "")
  .replace(/[ıİğüşöç]/g, (char) => TURKISH[char] ?? char)
  .toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^[^a-z]+|-+$/g, "")
  .slice(0, 63);

export const LIBRARY_STATUS_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "ACTIVE", label: "Etkin" },
  { value: "ARCHIVED", label: "Arşivde" },
];
