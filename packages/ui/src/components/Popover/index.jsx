import { useCallback, useEffect, useId, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import Portal from "@/components/Portal";
import { useFloating } from "@/hooks/useFloating";
import { overlayStack, useOverlayStack } from "@/hooks/useOverlayStack";
import { focusTrigger, getFocusableElements } from "@/utils/focus";
import { cx } from "@/utils/cx";
import "./popover.scss";

const Popover = ({
  trigger,
  children,
  placement = "bottom",
  align = "start",
  open: controlledOpen,
  onOpenChange,
  showArrow = true,
  title,
  closeButton = false,
  size = "md",
  dismissible = true,
  ariaLabel,
  ariaDescribedBy,
  className = "",
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const containerId = useId();
  const triggerId = useId();
  const popoverId = useId();
  const titleId = useId();

  useFloating({ open, anchorRef: containerRef, floatingRef: popoverRef, side: placement, align });
  const { isTopMost, zIndex } = useOverlayStack(open, popoverRef);

  const setOpen = useCallback((next) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }, [isControlled, onOpenChange]);

  const close = (restoreFocus) => {
    setOpen(false);
    if (restoreFocus) focusTrigger(triggerId, containerId);
  };

  useEffect(() => {
    if (!open || !popoverRef.current) return;
    const [firstFocusable] = getFocusableElements(popoverRef.current);
    (firstFocusable ?? popoverRef.current).focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (!dismissible) return;
      if (containerRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
      if (overlayStack.isInside(event.target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || !dismissible || !isTopMost) return;
      setOpen(false);
      focusTrigger(triggerId, containerId);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen, triggerId, containerId, dismissible, isTopMost]);

  const handlePopoverKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (dismissible) close(true);
      return;
    }

    if (event.key !== "Tab") return;

    const elements = getFocusableElements(popoverRef.current);
    const first = elements[0];
    const last = elements[elements.length - 1];
    const current = document.activeElement;
    const leavingStart = event.shiftKey && (current === first || current === popoverRef.current);
    const leavingEnd = !event.shiftKey && (current === last || elements.length === 0);

    if (leavingStart || leavingEnd) {
      event.preventDefault();
      close(true);
    }
  };

  const triggerProps = {
    id: triggerId,
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    "aria-controls": open ? popoverId : undefined,
  };

  const classes = cx("popover_container", className);

  return (
    <div className={classes} ref={containerRef} id={containerId}>
      {trigger({ open, toggle: () => setOpen(!open), triggerProps })}

      {open && (
        <Portal>
          <div
            ref={popoverRef}
            id={popoverId}
            className={cx("popover", `popover_${placement}`, `popover_size_${size}`)}
            style={{ zIndex }}
            role="dialog"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabel ? undefined : (title ? titleId : triggerId)}
            aria-describedby={ariaDescribedBy}
            tabIndex={-1}
            onKeyDown={handlePopoverKeyDown}
          >
            {showArrow && <span className="popover_arrow" aria-hidden="true" />}
            {(title || closeButton) && (
              <div className="popover_header">
                {title && <span className="popover_title" id={titleId}>{title}</span>}
                {closeButton && (
                  <button type="button" className="popover_close" onClick={() => close(true)} aria-label="Kapat">
                    <FiX aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            <div className="popover_content">
              {typeof children === "function" ? children({ close: () => close(true) }) : children}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default Popover;
