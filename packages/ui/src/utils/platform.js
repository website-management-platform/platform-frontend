const getPlatform = () => {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgentData?.platform ?? navigator.platform ?? "";
};

export const IS_MAC = /Mac|iPhone|iPad/.test(getPlatform());

export const MOD_KEY_LABEL = IS_MAC ? "⌘" : "Ctrl";

const ARIA_KEY_NAMES = {
  "⌘": "Meta",
  Ctrl: "Control",
  Shift: "Shift",
  Alt: "Alt",
  Esc: "Escape",
  Del: "Delete",
};

export const toAriaKeyShortcut = (keys) => (
  keys.map((key) => ARIA_KEY_NAMES[key] ?? key.toUpperCase()).join("+")
);
