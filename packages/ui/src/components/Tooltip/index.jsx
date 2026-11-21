import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import Portal from "@/components/Portal";
import { useFloating } from "@/hooks/useFloating";
import { cx } from "@/utils/cx";
import "./tooltip.scss";

const HIDE_DELAY = 100;

const Tooltip = ({
  content,
  placement = "top",
  describe = true,
  delay = 300,
  maxWidth,
  arrow = true,
  disabled = false,
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();
  const wrapperRef = useRef(null);
  const tooltipRef = useRef(null);
  const timerRef = useRef(null);
  const isShown = visible && Boolean(content) && !disabled;

  useFloating({ open: isShown, anchorRef: wrapperRef, floatingRef: tooltipRef, side: placement, align: "center" });

  useEffect(() => {
    const timers = timerRef;
    return () => clearTimeout(timers.current);
  }, []);

  useEffect(() => {
    if (!isShown) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || event.isComposing) return;
      event.stopPropagation();
      clearTimeout(timerRef.current);
      setVisible(false);
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isShown]);

  const schedule = (nextVisible, wait) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(nextVisible), wait);
  };

  const hideNow = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  const handleFocus = (event) => {
    if (event.target.matches(":focus-visible")) schedule(true, 0);
  };

  const describedBy = describe && isShown ? tooltipId : undefined;

  let trigger = children;
  if (typeof children === "function") {
    trigger = children({ "aria-describedby": describedBy });
  } else if (describe && isValidElement(children)) {
    trigger = cloneElement(children, {
      "aria-describedby": [children.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
    });
  }

  return (
    <span
      ref={wrapperRef}
      className="tooltip_wrapper"
      onMouseEnter={() => schedule(true, delay)}
      onMouseLeave={() => schedule(false, HIDE_DELAY)}
      onFocus={handleFocus}
      onBlur={hideNow}
      onClick={hideNow}
    >
      {trigger}

      {isShown && (
        <Portal>
          <span
            ref={tooltipRef}
            className={cx("tooltip", `tooltip_${placement}`, maxWidth && "tooltip_multiline", !arrow && "tooltip_no_arrow")}
            style={maxWidth ? { maxWidth } : undefined}
            role="tooltip"
            id={tooltipId}
            onMouseEnter={() => clearTimeout(timerRef.current)}
            onMouseLeave={() => schedule(false, HIDE_DELAY)}
          >
            {content}
          </span>
        </Portal>
      )}
    </span>
  );
};

export default Tooltip;
