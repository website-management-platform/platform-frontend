const hasControlCharacter = (value) => [...value].some((character) => {
  const code = character.charCodeAt(0);
  return code < 32 || code === 127;
});

const BLOCKED_PREFIXES = ["/giris", "/sifremi-unuttum", "/sifre-sifirla"];

export const safeReturnTo = (value, fallback = "/") => {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || hasControlCharacter(value)) return fallback;
  return BLOCKED_PREFIXES.some((prefix) => value === prefix || value.startsWith(`${prefix}?`) || value.startsWith(`${prefix}/`))
    ? fallback
    : value;
};

export const buildLoginPath = (location) => {
  const target = `${location.pathname}${location.search}`;
  return target === "/" ? "/giris" : `/giris?returnTo=${encodeURIComponent(target)}`;
};

export const buildAuthLink = (path, { returnTo, email } = {}) => {
  const params = new URLSearchParams();
  const safe = returnTo ? safeReturnTo(returnTo, null) : null;
  if (safe) params.set("returnTo", safe);
  if (email) params.set("email", email);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};
