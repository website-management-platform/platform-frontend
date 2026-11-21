import { useEffect, useId, useRef, useState } from "react";
import { FiCheck } from "react-icons/fi";
import Portal from "@/components/Portal";
import { useFloating } from "@/hooks/useFloating";
import { overlayStack, useOverlayStack } from "@/hooks/useOverlayStack";
import { focusTrigger } from "@/utils/focus";
import Kbd from "@/components/Kbd";
import { cx } from "@/utils/cx";
import { toAriaKeyShortcut } from "@/utils/platform";
import "./dropdown.scss";

const ITEM_SELECTOR = '[role^="menuitem"]:not(:disabled)';

const getMenuItems = (menu) => Array.from(menu?.querySelectorAll(ITEM_SELECTOR) ?? []);

const Dropdown = ({ trigger, children, placement = "bottom_start", className = "" }) => {
  const [open, setOpen] = useState(false);
  const [initialFocus, setInitialFocus] = useState("first");
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const containerId = useId();
  const triggerId = useId();
  const menuId = useId();
  const [side, align = "start"] = placement.split("_");

  useFloating({ open, anchorRef: containerRef, floatingRef: menuRef, side, align });
  const { isTopMost, zIndex } = useOverlayStack(open, menuRef);

  const openMenu = (focusTarget) => {
    setInitialFocus(focusTarget);
    setOpen(true);
  };

  const closeMenu = (restoreFocus) => {
    setOpen(false);
    if (restoreFocus) focusTrigger(triggerId, containerId);
  };

  useEffect(() => {
    if (!open) return;
    const items = getMenuItems(menuRef.current);
    const target = initialFocus === "last" ? items[items.length - 1] : items[0];
    target?.focus();
  }, [open, initialFocus]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (containerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      if (overlayStack.isInside(event.target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || !isTopMost) return;
      setOpen(false);
      focusTrigger(triggerId, containerId);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, triggerId, containerId, isTopMost]);

  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu("last");
    }
  };

  const handleMenuKeyDown = (event) => {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
      return;
    }

    const items = getMenuItems(menuRef.current);
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement);
    const lastIndex = items.length - 1;
    let nextIndex = null;

    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 || currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowUp") {
      nextIndex = currentIndex <= 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    items[nextIndex].focus();
  };

  const toggle = () => {
    if (open) closeMenu(false);
    else openMenu("first");
  };

  const triggerProps = {
    id: triggerId,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
    onKeyDown: handleTriggerKeyDown,
  };

  const classes = cx("dropdown", className);

  return (
    <div className={classes} ref={containerRef} id={containerId}>
      {trigger({ open, toggle, triggerProps })}

      {open && (
        <Portal>
          <div
            ref={menuRef}
            id={menuId}
            className={`dropdown_menu dropdown_menu_${placement}`}
            style={{ zIndex }}
            role="menu"
            aria-labelledby={triggerId}
            onKeyDown={handleMenuKeyDown}
          >
            {typeof children === "function" ? children({ close: () => closeMenu(true) }) : children}
          </div>
        </Portal>
      )}
    </div>
  );
};

export const DropdownItem = ({ icon: Icon, children, danger = false, checked, shortcut, onClick, ...rest }) => {
  const isCheckable = checked !== undefined;

  return (
    <button
      type="button"
      role={isCheckable ? "menuitemradio" : "menuitem"}
      aria-checked={isCheckable ? checked : undefined}
      aria-keyshortcuts={shortcut ? toAriaKeyShortcut(shortcut) : undefined}
      tabIndex={-1}
      className={cx("dropdown_item", danger ? "dropdown_item_danger" : "")}
      onClick={onClick}
      {...rest}
    >
      {Icon && <Icon className="dropdown_item_icon" aria-hidden="true" />}
      <span className="dropdown_item_label">{children}</span>
      {shortcut && <Kbd size="sm" keys={shortcut} className="dropdown_item_shortcut" aria-hidden="true" />}
      {isCheckable && checked && <FiCheck className="dropdown_item_check" aria-hidden="true" />}
    </button>
  );
};

export const DropdownLabel = ({ children }) => (
  <div className="dropdown_label" role="presentation">{children}</div>
);

export const DropdownDivider = () => <div className="dropdown_divider" role="separator" />;

export default Dropdown;
