import { useEffect } from "react";

const IGNORED_TAGS = ["SCRIPT", "STYLE", "LINK", "TEMPLATE"];
const inertCounts = new WeakMap();

const lockInert = (element) => {
  inertCounts.set(element, (inertCounts.get(element) ?? 0) + 1);
  element.inert = true;
};

const unlockInert = (element) => {
  const count = (inertCounts.get(element) ?? 1) - 1;
  if (count > 0) {
    inertCounts.set(element, count);
    return;
  }
  inertCounts.delete(element);
  element.inert = false;
};

const qualifies = (child, element) => (
  child instanceof Element
  && !child.contains(element)
  && !child.hasAttribute("data-inert-exempt")
  && !IGNORED_TAGS.includes(child.tagName)
);

export const useInertOthers = (elementRef, active) => {
  useEffect(() => {
    const element = elementRef.current;
    if (!active || !element) return undefined;

    const locked = Array.from(document.body.children).filter((child) => qualifies(child, element));
    locked.forEach(lockInert);

    return () => {
      locked.forEach(unlockInert);
    };
  }, [elementRef, active]);
};
