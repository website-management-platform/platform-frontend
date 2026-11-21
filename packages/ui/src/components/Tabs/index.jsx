import { useEffect, useId, useRef } from "react";
import { cx } from "@/utils/cx";
import "./tabs.scss";

const getTabId = (idPrefix, id) => `${idPrefix}-${id}`;
const getPanelId = (idPrefix, id) => `${idPrefix}panel-${id}`;

const NEXT_KEYS = { horizontal: "ArrowRight", vertical: "ArrowDown" };
const PREVIOUS_KEYS = { horizontal: "ArrowLeft", vertical: "ArrowUp" };

const Tabs = ({
  tabs,
  activeTab,
  onChange,
  variant = "line",
  size = "md",
  orientation = "horizontal",
  activationMode = "automatic",
  fullWidth = false,
  idPrefix,
  ariaLabel,
  className = "",
}) => {
  const generatedPrefix = useId();
  const prefix = idPrefix ?? generatedPrefix;
  const tabRefs = useRef(new Map());
  const enabledTabs = tabs.filter((tab) => !tab.disabled);

  const listRef = useRef(null);

  // Etkin sekme (ör. adresten gelen) yatay kaydırmalı listede görünür alana getirilir; yalnız liste kayar, sayfa kaymaz.
  useEffect(() => {
    const list = listRef.current;
    const node = tabRefs.current.get(activeTab);
    if (!list || !node || orientation !== "horizontal" || list.scrollWidth <= list.clientWidth) return;
    const start = node.offsetLeft;
    const end = start + node.offsetWidth;
    if (start < list.scrollLeft) list.scrollLeft = start;
    else if (end > list.scrollLeft + list.clientWidth) list.scrollLeft = end - list.clientWidth;
  }, [activeTab, orientation]);
  const focusableTabId = enabledTabs.some((tab) => tab.id === activeTab) ? activeTab : enabledTabs[0]?.id;

  const moveToTab = (tab) => {
    if (activationMode === "automatic" && !tab.disabled) onChange?.(tab.id);
    tabRefs.current.get(tab.id)?.focus();
  };

  const handleKeyDown = (event, tabId) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === tabId);
    const lastIndex = tabs.length - 1;
    let nextIndex = null;

    if (event.key === NEXT_KEYS[orientation]) nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    else if (event.key === PREVIOUS_KEYS[orientation]) nextIndex = currentIndex <= 0 ? lastIndex : currentIndex - 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = lastIndex;

    if (nextIndex === null) return;
    event.preventDefault();
    moveToTab(tabs[nextIndex]);
  };

  return (
    <div
      className={cx(
        "tabs",
        `tabs_${variant}`,
        `tabs_${size}`,
        `tabs_${orientation}`,
        fullWidth && "tabs_full_width",
        className,
      )}
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation === "vertical" ? "vertical" : undefined}
    >
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              if (node) tabRefs.current.set(tab.id, node);
              else tabRefs.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            id={getTabId(prefix, tab.id)}
            aria-selected={selected}
            aria-controls={getPanelId(prefix, tab.id)}
            tabIndex={tab.id === focusableTabId ? 0 : -1}
            aria-disabled={tab.disabled || undefined}
            className={cx("tabs_item", selected && "tabs_item_active")}
            onClick={() => !tab.disabled && onChange?.(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, tab.id)}
          >
            {Icon && <Icon className="tabs_icon" aria-hidden="true" />}
            <span className="tabs_label">{tab.label}</span>
            {tab.dot && <span className={cx("tabs_dot", `tabs_dot_${tab.dot}`)} aria-hidden="true" />}
            {tab.badge !== undefined && <span className="tabs_badge">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};

export const TabPanel = ({ id, activeTab, idPrefix, keepMounted = false, className = "", children }) => {
  const generatedPrefix = useId();
  const prefix = idPrefix ?? generatedPrefix;
  const active = id === activeTab;
  if (!active && !keepMounted) return null;

  return (
    <div
      role="tabpanel"
      id={getPanelId(prefix, id)}
      aria-labelledby={getTabId(prefix, id)}
      tabIndex={0}
      hidden={!active}
      className={cx("tabs_panel", className)}
    >
      {children}
    </div>
  );
};

export default Tabs;
