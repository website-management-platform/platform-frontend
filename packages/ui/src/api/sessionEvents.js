const listeners = new Set();

export const sessionEvents = {
  emit: (type, payload) => {
    listeners.forEach((listener) => listener({ type, payload }));
  },
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
