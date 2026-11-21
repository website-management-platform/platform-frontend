import { storageKey } from "@/config/app.config";

const STORAGE_KEY = storageKey("recent_routes");
const MAX_RECENT_ROUTES = 5;

export const readRecentRouteIds = () => {
  try {
    const storedValue = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return Array.isArray(storedValue) ? storedValue : [];
  } catch {
    return [];
  }
};

export const recordRecentRoute = (routeId) => {
  try {
    const nextIds = [routeId, ...readRecentRouteIds().filter((id) => id !== routeId)].slice(0, MAX_RECENT_ROUTES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
    return true;
  } catch {
    return false;
  }
};
