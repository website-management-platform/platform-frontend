import { useEffect } from "react";

const EDGE_TOLERANCE = 1;

export const useScrollEdges = (scrollRef, targetRef, active) => {
  useEffect(() => {
    const scrollElement = scrollRef.current;
    const targetElement = targetRef.current;
    if (!active || !scrollElement || !targetElement) return undefined;

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      targetElement.dataset.scrolledTop = String(scrollTop > EDGE_TOLERANCE);
      targetElement.dataset.scrolledBottom = String(scrollTop + clientHeight < scrollHeight - EDGE_TOLERANCE);
    };

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scrollElement);
    Array.from(scrollElement.children).forEach((child) => resizeObserver.observe(child));
    scrollElement.addEventListener("scroll", update, { passive: true });

    return () => {
      resizeObserver.disconnect();
      scrollElement.removeEventListener("scroll", update);
    };
  }, [scrollRef, targetRef, active]);
};
