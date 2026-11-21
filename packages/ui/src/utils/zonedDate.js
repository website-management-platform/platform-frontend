const LOCALE = "tr-TR";

const partsInZone = (date, timeZone) => Object.fromEntries(
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)]),
);

const offsetInZone = (instant, timeZone) => {
  const parts = partsInZone(new Date(instant), timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - (Math.floor(instant / 1000) * 1000);
};

const dayFormatter = (timeZone) => new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const dateInZone = (value, timeZone) => dayFormatter(timeZone).format(value instanceof Date ? value : new Date(value));

export const todayInZone = (timeZone) => dateInZone(new Date(), timeZone);

export const addDays = (date, days) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

export const zonedDateTimeToIso = (date, time, timeZone) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second] = time.split(":").map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstGuess = wallClock - offsetInZone(wallClock, timeZone);
  const secondOffset = offsetInZone(firstGuess, timeZone);
  const candidate = wallClock - secondOffset;
  if (offsetInZone(candidate, timeZone) === secondOffset) return new Date(candidate).toISOString();
  return new Date(Math.max(firstGuess, candidate)).toISOString();
};

export const startOfDayIso = (date, timeZone) => zonedDateTimeToIso(date, "00:00:00", timeZone);

export const exclusiveEndOfDayIso = (date, timeZone) => startOfDayIso(addDays(date, 1), timeZone);

export const lastDayInZone = (exclusiveEnd, timeZone) => dateInZone(Date.parse(exclusiveEnd) - 1, timeZone);

export const formatDayLabel = (date) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
};

export const monthKeyIn = (value, timeZone) => dateInZone(value, timeZone).slice(0, 7);

export const recentMonthKeys = (timeZone, count) => {
  const [year, month] = monthKeyIn(new Date(), timeZone).split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - index), 15));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
};

export const formatMonthLabel = (monthKey, { long = false } = {}) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleString(LOCALE, long
    ? { month: "long", year: "numeric", timeZone: "UTC" }
    : { month: "short", timeZone: "UTC" });
};
