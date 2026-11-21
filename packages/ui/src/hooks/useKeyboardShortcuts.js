import { useEffect, useRef } from "react";
import { overlayStack } from "@/hooks/useOverlayStack";

const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable=''], [contenteditable='true']";

const isEditableTarget = (target) => target instanceof Element && Boolean(target.closest(EDITABLE_SELECTOR));

const LETTER_PATTERN = /^[a-z]$/i;

const matchesShortcut = (shortcut, event) => {
  if (typeof event.key !== "string") return false;
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) return false;
  if (event.altKey) return false;
  if (shortcut.shift !== undefined) {
    if (shortcut.shift !== event.shiftKey) return false;
  } else if (LETTER_PATTERN.test(shortcut.key) && event.shiftKey) {
    return false;
  }
  return Boolean(shortcut.mod) === (event.metaKey || event.ctrlKey);
};

export const useKeyboardShortcuts = (shortcuts, { singleKeyEnabled = true } = {}) => {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (overlayStack.size() > 0) return;

      const shortcut = shortcutsRef.current.find((item) => matchesShortcut(item, event));
      if (!shortcut) return;
      if (!shortcut.mod && (!singleKeyEnabled || isEditableTarget(event.target))) return;

      event.preventDefault();
      shortcut.handler(event);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [singleKeyEnabled]);
};
