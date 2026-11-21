import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { FiChevronRight, FiMoreHorizontal } from "react-icons/fi";
import { cx } from "@/utils/cx";
import "./breadcrumb.scss";

const SEPARATORS = {
  slash: "/",
  dot: "•",
};

const Separator = ({ type }) => (
  type === "chevron"
    ? <FiChevronRight className="breadcrumb_separator" aria-hidden="true" />
    : <span className="breadcrumb_separator breadcrumb_separator_text" aria-hidden="true">{SEPARATORS[type]}</span>
);

const Breadcrumb = ({ items, maxVisible = 4, separator = "chevron", size = "md", className = "" }) => {
  const [expanded, setExpanded] = useState(false);
  const navRef = useRef(null);
  const effectiveMaxVisible = Math.max(3, maxVisible);
  const shouldCollapse = !expanded && items.length > effectiveMaxVisible;
  const hiddenCount = items.length - (effectiveMaxVisible - 1);
  const visibleItems = shouldCollapse
    ? [items[0], { collapsed: true }, ...items.slice(items.length - (effectiveMaxVisible - 2))]
    : items;

  useEffect(() => {
    if (!expanded) return;
    navRef.current?.querySelectorAll(".breadcrumb_item")[1]?.querySelector("a")?.focus();
  }, [expanded]);

  return (
    <nav ref={navRef} className={cx("breadcrumb", `breadcrumb_${size}`, className)} aria-label="Sayfa yolu">
      <ol className="breadcrumb_list">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;

          if (item.collapsed) {
            return (
              <li key="collapsed" className="breadcrumb_item">
                <button
                  type="button"
                  className="breadcrumb_ellipsis"
                  onClick={() => setExpanded(true)}
                  aria-label={`Gizli ${hiddenCount} adımı göster`}
                >
                  <FiMoreHorizontal size={14} aria-hidden="true" />
                </button>
                <Separator type={separator} />
              </li>
            );
          }

          const Icon = item.icon;

          return (
            <li key={`${item.path ?? item.label}-${index}`} className="breadcrumb_item">
              {isLast || !item.path ? (
                <span className="breadcrumb_current" aria-current={isLast ? "page" : undefined}>
                  {Icon && <Icon className="breadcrumb_icon" aria-hidden="true" />}
                  {item.label}
                </span>
              ) : (
                <Link to={item.path} className="breadcrumb_link">
                  {Icon && <Icon className="breadcrumb_icon" aria-hidden="true" />}
                  {item.label}
                </Link>
              )}
              {!isLast && <Separator type={separator} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
