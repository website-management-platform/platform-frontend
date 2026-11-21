import { storageKey } from "@/config/app.config";

const RELOAD_MARK_KEY = storageKey("chunk_reload_at");
const RELOAD_COOLDOWN = 10000;

const CHUNK_ERROR_PATTERN = /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i;

export const isChunkLoadError = (error) => CHUNK_ERROR_PATTERN.test(error?.message ?? "");

const readReloadMark = () => {
  try {
    return Number(window.sessionStorage.getItem(RELOAD_MARK_KEY)) || 0;
  } catch {
    return 0;
  }
};

const writeReloadMark = (time) => {
  try {
    window.sessionStorage.setItem(RELOAD_MARK_KEY, String(time));
    return true;
  } catch {
    return false;
  }
};

export const reloadForNewVersion = () => {
  const now = Date.now();
  if (now - readReloadMark() < RELOAD_COOLDOWN) return false;
  writeReloadMark(now);
  window.location.reload();
  return true;
};

export const registerChunkErrorRecovery = () => {
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadForNewVersion()) event.preventDefault();
  });
};
