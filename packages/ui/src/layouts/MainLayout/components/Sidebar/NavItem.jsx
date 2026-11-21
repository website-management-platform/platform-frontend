import { useEffect, useId, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { FiChevronDown } from "react-icons/fi";
import Tooltip from "@/components/Tooltip";
import { isExactRoute } from "@/app/routing";
import { cx } from "@/utils/cx";

const FLYOUT_OFFSET = 8;
const VIEWPORT_GUTTER = 16;

const pathMatches = (itemPath, pathname) => (
  pathname === itemPath || pathname.startsWith(`${itemPath}/`)
);

const containsActivePath = (item, pathname) => {
  if (pathMatches(item.path, pathname)) return true;
  if (!item.children) return false;
  return item.children.some((child) => containsActivePath(child, pathname));
};

const hasBadge = (item) => item.badge !== undefined && item.badge !== null && item.badge !== 0;

const getAccessibleLabel = (item) => (
  hasBadge(item) ? `${item.label} (${item.badge})` : item.label
);

const NavItem = ({ item, depth, collapsed, onNavigate }) => {
  const location = useLocation();
  // Öğeler useMenuGroups ile süzülmüş ve yolları çözülmüş gelir.
  const menuChildren = item.children ?? [];
  const hasChildren = menuChildren.length > 0;
  const [open, setOpen] = useState(() => (hasChildren ? containsActivePath(item, location.pathname) : false));
  const [flyout, setFlyout] = useState(null);
  const itemRef = useRef(null);
  const toggleRef = useRef(null);
  const flyoutRef = useRef(null);
  const flyoutId = useId();
  const Icon = item.icon;

  const [previousPathname, setPreviousPathname] = useState(location.pathname);

  if (previousPathname !== location.pathname) {
    setPreviousPathname(location.pathname);
    if (hasChildren) setOpen(containsActivePath(item, location.pathname));
  }

  if (!collapsed && flyout) setFlyout(null);

  const flyoutOpen = collapsed && flyout !== null;

  useEffect(() => {
    if (!flyoutOpen) return undefined;

    const closeFlyout = () => setFlyout(null);

    const handlePointerDown = (event) => {
      if (!itemRef.current?.contains(event.target)) closeFlyout();
    };

    const handleScroll = (event) => {
      if (!flyoutRef.current?.contains(event.target)) closeFlyout();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", closeFlyout);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", closeFlyout);
    };
  }, [flyoutOpen]);

  if (collapsed && depth > 0) return null;

  if (!hasChildren) {
    const link = (
      <NavLink
        to={item.path}
        end={isExactRoute(item)}
        className={({ isActive }) => (
          cx("sidebar_link", isActive && "sidebar_link_active")
        )}
        aria-label={collapsed ? getAccessibleLabel(item) : undefined}
        onClick={onNavigate}
      >
        {Icon && <Icon className="sidebar_icon" aria-hidden="true" />}
        {!collapsed && <span className="sidebar_label">{item.label}</span>}
        {!collapsed && hasBadge(item) && (
          <span className="sidebar_badge">{item.badge}</span>
        )}
      </NavLink>
    );

    return (
      <li>
        {collapsed ? (
          <Tooltip content={item.label} placement="right" describe={false}>{link}</Tooltip>
        ) : link}
      </li>
    );
  }

  const isDescendantActive = containsActivePath(item, location.pathname);

  const handleToggleClick = (event) => {
    if (!collapsed) {
      setOpen((prev) => !prev);
      return;
    }

    if (flyoutOpen) {
      setFlyout(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const left = rect.right + FLYOUT_OFFSET;
    const openUpward = rect.top > window.innerHeight / 2;

    setFlyout(openUpward
      ? { bottom: window.innerHeight - rect.bottom, left }
      : { top: rect.top, left });
  };

  const handleItemKeyDown = (event) => {
    if (event.key !== "Escape" || !flyoutOpen) return;
    setFlyout(null);
    toggleRef.current?.focus();
  };

  const handleItemBlur = (event) => {
    if (!flyoutOpen) return;
    if (!event.currentTarget.contains(event.relatedTarget)) setFlyout(null);
  };

  const handleFlyoutNavigate = () => {
    setFlyout(null);
    onNavigate?.();
  };

  const toggleButton = (
    <button
      ref={toggleRef}
      type="button"
      className={cx(
        "sidebar_link",
        "sidebar_link_toggle",
        isDescendantActive ? "sidebar_link_active" : "",
      )}
      onClick={handleToggleClick}
      aria-label={collapsed ? item.label : undefined}
      aria-expanded={collapsed ? flyoutOpen : open}
      aria-controls={flyoutOpen ? flyoutId : undefined}
    >
      {Icon && <Icon className="sidebar_icon" aria-hidden="true" />}
      {!collapsed && <span className="sidebar_label">{item.label}</span>}
      {!collapsed && (
        <FiChevronDown
          className={`sidebar_chevron ${open ? "sidebar_chevron_open" : ""}`}
          size={14}
          aria-hidden="true"
        />
      )}
    </button>
  );

  return (
    <li ref={itemRef} onKeyDown={handleItemKeyDown} onBlur={handleItemBlur}>
      {collapsed ? (
        <Tooltip content={flyoutOpen ? null : item.label} placement="right" describe={false}>
          {toggleButton}
        </Tooltip>
      ) : toggleButton}

      {!collapsed && open && (
        <ul className="sidebar_sublist">
          {menuChildren.map((child) => (
            <NavItem
              key={child.id}
              item={child}
              depth={depth + 1}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}

      {flyoutOpen && (
        <div
          ref={flyoutRef}
          id={flyoutId}
          className="sidebar_flyout"
          tabIndex={-1}
          style={{
            top: flyout.top,
            bottom: flyout.bottom,
            left: flyout.left,
            maxHeight: `calc(100vh - ${(flyout.top ?? flyout.bottom) + VIEWPORT_GUTTER}px)`,
          }}
        >
          <span className="sidebar_flyout_title">{item.label}</span>
          <ul className="sidebar_flyout_list">
            {menuChildren.map((child) => (
              <NavItem
                key={child.id}
                item={child}
                depth={depth + 1}
                collapsed={false}
                onNavigate={handleFlyoutNavigate}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
};

export default NavItem;
