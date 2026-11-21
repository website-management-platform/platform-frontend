const LOCALE = "tr-TR";

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

const RELATIVE_UNITS = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

const toDate = (value) => (value instanceof Date ? value : new Date(value));

export const formatDate = (value) => (value ? dateFormatter.format(toDate(value)) : "");

export const formatDateTime = (value) => (value ? dateTimeFormatter.format(toDate(value)) : "");

export const formatRelativeTime = (value, now = Date.now()) => {
  if (!value) return "";
  const diffSeconds = Math.round((toDate(value).getTime() - now) / 1000);
  const absolute = Math.abs(diffSeconds);
  if (absolute < 45) return "az önce";
  const [unit, seconds] = RELATIVE_UNITS.find(([, size]) => absolute >= size) ?? RELATIVE_UNITS.at(-1);
  return relativeFormatter.format(Math.round(diffSeconds / seconds), unit);
};

const byteFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

export const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${byteFormatter.format(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${byteFormatter.format(bytes / 1024 / 1024)} MB`;
  return `${byteFormatter.format(bytes / 1024 / 1024 / 1024)} GB`;
};

const moneyFormatters = new Map();
const moneyFormatter = (currency, fractionDigits) => {
  const key = `${currency}:${fractionDigits}`;
  if (!moneyFormatters.has(key)) {
    moneyFormatters.set(key, new Intl.NumberFormat(LOCALE, { style: "currency", currency, minimumFractionDigits: fractionDigits, maximumFractionDigits: 2 }));
  }
  return moneyFormatters.get(key);
};

// Panelin tek para biçimi: tutar kuruş (minor) cinsinden gelir. compact: tam tutarda kuruş yazılmaz (vitrin fiyatı).
// Tutar yoksa "—".
export const formatMoney = (minor, { currency = "TRY", compact = false } = {}) => {
  if (!Number.isFinite(minor)) return "—";
  return moneyFormatter(currency, compact && minor % 100 === 0 ? 0 : 2).format(minor / 100);
};
