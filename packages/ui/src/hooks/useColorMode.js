import { useCallback, useEffect, useState } from "react";
import { storageKey } from "@/config/app.config";

const STORAGE_KEY = storageKey("color_mode");
const DEFAULT_COLOR_MODE = "light";
const COLOR_MODES = ["light", "dark"];

const loadColorMode = () => {
  try {
    const storedColorMode = window.localStorage.getItem(STORAGE_KEY);
    return COLOR_MODES.includes(storedColorMode) ? storedColorMode : DEFAULT_COLOR_MODE;
  } catch {
    return DEFAULT_COLOR_MODE;
  }
};

const saveColorMode = (colorMode) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, colorMode);
    return true;
  } catch {
    return false;
  }
};

const syncThemeColorMeta = (root) => {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const surfaceColor = getComputedStyle(root).getPropertyValue("--app-color-surface").trim();
  if (surfaceColor) meta.setAttribute("content", surfaceColor);
};

export const useColorMode = () => {
  const [colorMode, setColorMode] = useState(loadColorMode);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme-switching", "");
    root.setAttribute("data-theme", colorMode);
    root.style.colorScheme = colorMode;
    syncThemeColorMeta(root);
    saveColorMode(colorMode);

    const frame = requestAnimationFrame(() => root.removeAttribute("data-theme-switching"));
    return () => {
      cancelAnimationFrame(frame);
      root.removeAttribute("data-theme-switching");
    };
  }, [colorMode]);

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return {
    colorMode,
    setColorMode,
    toggleColorMode,
  };
};
