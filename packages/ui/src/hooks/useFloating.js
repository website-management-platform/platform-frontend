import { useLayoutEffect } from "react";

const VIEWPORT_PADDING = 8;
const ARROW_PADDING = 12;
const OPPOSITE_SIDE = { top: "bottom", bottom: "top", left: "right", right: "left" };

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

const resolveAnchor = (element) => (
  element.getClientRects().length === 0 && element.firstElementChild ? element.firstElementChild : element
);

const getCoords = (anchor, floating, side, align, offset) => {
  if (side === "top" || side === "bottom") {
    const top = side === "top" ? anchor.top - floating.height - offset : anchor.bottom + offset;
    let left = anchor.left + anchor.width / 2 - floating.width / 2;
    if (align === "start") left = anchor.left;
    if (align === "end") left = anchor.right - floating.width;
    return { top, left };
  }

  const left = side === "left" ? anchor.left - floating.width - offset : anchor.right + offset;
  let top = anchor.top + anchor.height / 2 - floating.height / 2;
  if (align === "start") top = anchor.top;
  if (align === "end") top = anchor.bottom - floating.height;
  return { top, left };
};

const overflowsMainAxis = ({ top, left }, floating, side) => {
  if (side === "top") return top < VIEWPORT_PADDING;
  if (side === "bottom") return top + floating.height > window.innerHeight - VIEWPORT_PADDING;
  if (side === "left") return left < VIEWPORT_PADDING;
  return left + floating.width > window.innerWidth - VIEWPORT_PADDING;
};

export const computeFloatingPosition = (anchor, floating, side, align, offset) => {
  let resolvedSide = side;
  let coords = getCoords(anchor, floating, side, align, offset);

  if (overflowsMainAxis(coords, floating, side)) {
    const oppositeSide = OPPOSITE_SIDE[side];
    const oppositeCoords = getCoords(anchor, floating, oppositeSide, align, offset);
    if (!overflowsMainAxis(oppositeCoords, floating, oppositeSide)) {
      resolvedSide = oppositeSide;
      coords = oppositeCoords;
    }
  }

  const isVertical = resolvedSide === "top" || resolvedSide === "bottom";
  const top = isVertical
    ? coords.top
    : clamp(coords.top, VIEWPORT_PADDING, window.innerHeight - floating.height - VIEWPORT_PADDING);
  const left = isVertical
    ? clamp(coords.left, VIEWPORT_PADDING, window.innerWidth - floating.width - VIEWPORT_PADDING)
    : coords.left;
  const arrowOffset = isVertical
    ? clamp(anchor.left + anchor.width / 2 - left, ARROW_PADDING, floating.width - ARROW_PADDING)
    : clamp(anchor.top + anchor.height / 2 - top, ARROW_PADDING, floating.height - ARROW_PADDING);

  return { top, left, side: resolvedSide, arrowOffset };
};

export const useFloating = ({ open, anchorRef, floatingRef, side = "bottom", align = "center", offset = 8 }) => {
  useLayoutEffect(() => {
    const anchorElement = anchorRef.current;
    const floatingElement = floatingRef.current;
    if (!open || !anchorElement || !floatingElement) return undefined;

    const update = () => {
      const position = computeFloatingPosition(
        resolveAnchor(anchorElement).getBoundingClientRect(),
        floatingElement.getBoundingClientRect(),
        side,
        align,
        offset,
      );
      floatingElement.style.top = `${position.top}px`;
      floatingElement.style.left = `${position.left}px`;
      floatingElement.style.setProperty("--floating-arrow-offset", `${position.arrowOffset}px`);
      floatingElement.dataset.side = position.side;
    };

    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(resolveAnchor(anchorElement));
    resizeObserver.observe(floatingElement);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef, floatingRef, side, align, offset]);
};
