import { useEffect } from "react";
import { getFocusableElements } from "@/utils/focus";

const MAIN_CONTENT_SELECTOR = "#main-content";
const INITIAL_FOCUS_ATTEMPTS = 30;

export const useFocusTrap = (containerRef, active, { initialFocusRef } = {}) => {
  useEffect(() => {
    if (!active || !containerRef.current) return undefined;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement;
    const previousId = previouslyFocused instanceof HTMLElement ? previouslyFocused.id : "";
    const focusableElements = getFocusableElements(container);
    const initialTarget = initialFocusRef?.current
      ?? focusableElements.find((element) => !element.hasAttribute("data-focus-fallback"))
      ?? focusableElements[0]
      ?? container;

    let retryFrame = null;
    const retryInitialFocus = (attemptsLeft) => {
      if (attemptsLeft === 0 || container.contains(document.activeElement)) return;
      retryFrame = requestAnimationFrame(() => {
        initialTarget.focus();
        retryInitialFocus(attemptsLeft - 1);
      });
    };
    initialTarget.focus();
    retryInitialFocus(INITIAL_FOCUS_ATTEMPTS);

    const handleKeyDown = (event) => {
      if (event.key !== "Tab") return;

      const elements = getFocusableElements(container);
      if (elements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || current === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const restoreFocus = () => {
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
        return;
      }
      const current = document.activeElement;
      if (current && current !== document.body && current.isConnected && !container.contains(current)) return;
      const replacement = previousId ? document.getElementById(previousId) : null;
      (replacement ?? document.querySelector(MAIN_CONTENT_SELECTOR))?.focus({ preventScroll: true });
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(retryFrame);
      container.removeEventListener("keydown", handleKeyDown);
      restoreFocus();
      const restored = previouslyFocused instanceof HTMLElement && document.activeElement === previouslyFocused;
      if (!restored) requestAnimationFrame(restoreFocus);
    };
  }, [containerRef, active, initialFocusRef]);
};
