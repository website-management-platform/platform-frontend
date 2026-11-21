import { useCallback, useSyncExternalStore } from "react";

// Tarayıcıda kalıcı durum. Aynı anahtarı kullanan bütün bileşenler aynı değeri görür (ör. sepet hem üst çubukta hem
// yapılandırıcıda). Depolama kullanılamazsa (gizli pencere, engellenmiş site verisi) değer yalnız bellekte tutulur.
const memory = new Map();
const listeners = new Map();

const readValue = (key, defaultValue) => {
  if (memory.has(key)) return memory.get(key);
  let value = defaultValue;
  try {
    const storedValue = window.localStorage.getItem(key);
    if (storedValue !== null) value = JSON.parse(storedValue);
  } catch {
    value = defaultValue;
  }
  memory.set(key, value);
  return value;
};

const writeValue = (key, value) => {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Depolama yoksa değer bu oturumla sınırlı kalır.
  }
  listeners.get(key)?.forEach((listener) => listener());
};

const subscribe = (key, listener) => {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(listener);
  return () => listeners.get(key).delete(listener);
};

export const usePersistentState = (key, defaultValue) => {
  const value = useSyncExternalStore(
    useCallback((listener) => subscribe(key, listener), [key]),
    () => readValue(key, defaultValue),
  );
  const setValue = useCallback((next) => {
    const current = readValue(key, defaultValue);
    writeValue(key, typeof next === "function" ? next(current) : next);
  }, [key, defaultValue]);
  return [value, setValue];
};
