import { useRef } from "react";
import { Link } from "react-router";
import { FiX } from "react-icons/fi";
import { useMenuGroups } from "@/app/routing";
import { APP_NAME, APP_SHORT_NAME } from "@/config/app.config";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import Skeleton from "@/components/Skeleton";
import NavItem from "./NavItem";
import { cx } from "@/utils/cx";
import "./sidebar.scss";

const SKELETON_ITEMS = 6;

const Sidebar = ({
  collapsed,
  mobileOpen,
  onCloseMobile,
  footer,
  loading = false,
}) => {
  const visibleGroups = useMenuGroups();
  const footerContent = typeof footer === "function" ? footer({ collapsed }) : footer;

  const asideRef = useRef(null);
  useFocusTrap(asideRef, mobileOpen);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") onCloseMobile();
  };

  return (
    <>
      <div
        className={`sidebar_overlay ${mobileOpen ? "sidebar_overlay_visible" : ""}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside
        ref={asideRef}
        className={cx(
          "sidebar",
          collapsed ? "sidebar_collapsed" : "",
          mobileOpen ? "sidebar_mobile_open" : "",
        )}
        id="app-sidebar"
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen || undefined}
        aria-label="Ana menü"
        onKeyDown={handleKeyDown}
      >
        <div className="sidebar_brand">
          <Link
            to="/"
            className="sidebar_brand_link"
            aria-label={collapsed ? APP_NAME : undefined}
            onClick={onCloseMobile}
          >
            <span className="sidebar_brand_mark" aria-hidden="true">{APP_SHORT_NAME}</span>
            {!collapsed && <span className="sidebar_brand_name">{APP_NAME}</span>}
          </Link>
          <button
            type="button"
            className="sidebar_close"
            onClick={onCloseMobile}
            aria-label="Menüyü kapat"
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className="sidebar_nav" aria-busy={loading || undefined}>
          {loading && (
            <div className="sidebar_loading" aria-hidden="true">
              {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
                <Skeleton key={index} variant="rectangle" height={collapsed ? 36 : 32} radius="md" />
              ))}
            </div>
          )}
          {!loading && visibleGroups.map((group, index) => (
            <div className="sidebar_group" key={group.id}>
              {index > 1 && <div className="sidebar_divider" />}
              {group.title && !collapsed && (
                <span className="sidebar_group_title">{group.title}</span>
              )}
              <ul className="sidebar_list">
                {group.items.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    depth={0}
                    collapsed={collapsed}
                    onNavigate={onCloseMobile}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {footer && <div className="sidebar_footer">{footerContent}</div>}
      </aside>
    </>
  );
};

export default Sidebar;
