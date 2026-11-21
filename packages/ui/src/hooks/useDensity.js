import { useCallback, useEffect, useState } from "react";
import { storageKey } from "@/config/app.config";

const STORAGE_KEY = storageKey("density");
const DEFAULT_DENSITY = "comfortable";
const DENSITIES = ["comfortable", "compact"];

const loadDensity = () => {
  try {
    const storedDensity = window.localStorage.getItem(STORAGE_KEY);
    return DENSITIES.includes(storedDensity) ? storedDensity : DEFAULT_DENSITY;
  } catch {
    return DEFAULT_DENSITY;
  }
};

const saveDensity = (density) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, density);
    return true;
  } catch {
    return false;
  }
};

export const useDensity = () => {
  const [density, setDensity] = useState(loadDensity);

  useEffect(() => {
    const root = document.documentElement;
    if (density === "compact") root.setAttribute("data-density", "compact");
    else root.removeAttribute("data-density");
    saveDensity(density);
  }, [density]);

  const toggleDensity = useCallback(() => {
    setDensity((prev) => (prev === "compact" ? "comfortable" : "compact"));
  }, []);

  return {
    density,
    setDensity,
    toggleDensity,
  };
};
