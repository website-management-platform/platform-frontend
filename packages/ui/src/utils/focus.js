const NOT_REMOVED_FROM_TAB_ORDER = ":not([tabindex=\"-1\"])";

export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=\"hidden\"])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]",
].map((selector) => `${selector}${NOT_REMOVED_FROM_TAB_ORDER}`).join(", ");

export const getFocusableElements = (container) => (
  Array.from(container?.querySelectorAll(FOCUSABLE_SELECTOR) ?? [])
    .filter((element) => !element.closest("[inert]") && element.getClientRects().length > 0)
);

export const focusTrigger = (triggerId, containerId) => {
  const triggerElement = document.getElementById(triggerId)
    ?? document.getElementById(containerId)?.firstElementChild;
  triggerElement?.focus();
};

const MAIN_CONTENT_SELECTOR = "#main-content";

export const findNearestFocusable = (element) => {
  const candidates = getFocusableElements(document.body).filter((candidate) => !element.contains(candidate));
  const next = candidates.find((candidate) => element.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING);
  const previous = [...candidates].reverse().find((candidate) => element.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_PRECEDING);
  return next ?? previous ?? document.querySelector(MAIN_CONTENT_SELECTOR);
};

export const keepFocusAfterRemoval = (element) => {
  if (!element?.contains(document.activeElement)) return;
  const target = findNearestFocusable(element);
  requestAnimationFrame(() => {
    if (element.isConnected) return;
    if (document.activeElement && document.activeElement !== document.body) return;
    target?.focus();
  });
};
