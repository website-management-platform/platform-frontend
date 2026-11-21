// Site dili seçenekleri (BCP 47). Liste yaygın dillerle başlar; sözleşme 20'ye kadar dil kabul eder (02-tenancy.md).
const LOCALE_CODES = ["tr", "en", "de", "fr", "es", "it", "nl", "pt", "ru", "uk", "pl", "el", "ar", "fa", "he", "az", "ka", "ja", "zh", "ko"];

const languageNames = new Intl.DisplayNames(["tr"], { type: "language" });

export const LOCALE_OPTIONS = LOCALE_CODES.map((code) => ({ value: code, label: `${languageNames.of(code)} (${code})` }));

export const localeLabel = (code) => LOCALE_OPTIONS.find((option) => option.value === code)?.label ?? code;

export const TIMEZONE_OPTIONS = Intl.supportedValuesOf("timeZone").map((zone) => ({ value: zone, label: zone.replaceAll("_", " ") }));
