import { useEffect, useId, useRef, useSyncExternalStore } from "react";

const BASE_Z_INDEX_TOKEN = "--app-z-overlay";
const FALLBACK_BASE_Z_INDEX = 500;
const Z_INDEX_STEP = 5;

let baseZIndex = null;

const getBaseZIndex = () => {
  if (baseZIndex === null) {
    const tokenValue = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue(BASE_Z_INDEX_TOKEN), 10);
    baseZIndex = Number.isNaN(tokenValue) ? FALLBACK_BASE_Z_INDEX : tokenValue;
  }
  return baseZIndex;
};

let stack = [];
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

let idsCache = [];
let idsCacheSource = null;

const getIds = () => {
  if (idsCacheSource !== stack) {
    idsCache = stack.map((entry) => entry.id);
    idsCacheSource = stack;
  }
  return idsCache;
};

export const overlayStack = {
  size: () => stack.length,
  topId: () => stack[stack.length - 1]?.id,
  isInside: (target) => stack.some((entry) => entry.element?.contains(target)),
};

export const useOverlayStack = (active, elementRef) => {
  const id = useId();
  const fallbackRef = useRef(null);
  const ref = elementRef ?? fallbackRef;

  useEffect(() => {
    if (!active) return undefined;
    stack = [...stack, { id, element: ref.current }];
    notify();
    return () => {
      stack = stack.filter((entry) => entry.id !== id);
      notify();
    };
  }, [active, id, ref]);

  const currentIds = useSyncExternalStore(subscribe, getIds, () => []);
  const position = currentIds.indexOf(id);
  const isTopMost = active && position === currentIds.length - 1;
  const zIndex = getBaseZIndex() + Math.max(position, 0) * Z_INDEX_STEP;

  return { isTopMost, zIndex, overlayRef: ref };
};
