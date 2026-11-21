import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { FiSearch } from "react-icons/fi";
import Portal from "@/components/Portal";
import Kbd from "@/components/Kbd";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useInertOthers } from "@/hooks/useInertOthers";
import { useOverlayStack } from "@/hooks/useOverlayStack";
import { usePresence } from "@/hooks/usePresence";
import { getRouteTrail, useCommandSearch, useNavigablePages } from "@/app/routing";
import { cx } from "@/utils/cx";
import { toAriaKeyShortcut } from "@/utils/platform";
import { readRecentRouteIds } from "./recentRoutes";
import "./command_palette.scss";

const normalizeText = (text) => (
  text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
);

const toPageItem = ({ item, path }) => {
  const trail = getRouteTrail(path);
  return {
    id: item.id,
    type: "page",
    label: item.label,
    path,
    icon: item.icon ?? [...trail].reverse().find((trailItem) => trailItem.icon)?.icon,
    hint: item.hint ?? trail.slice(0, -1).map((trailItem) => trailItem.label).join(" › "),
  };
};

const CommandPalette = ({ open, onClose, actions = [] }) => {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState(readRecentRouteIds);
  const [previousOpen, setPreviousOpen] = useState(open);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { mounted, visible } = usePresence(open, "--app-duration-slow");
  const navigablePages = useNavigablePages();
  // Uygulama verisinde arama (isteğe bağlı): kapalıyken sorgu gönderilmez.
  const appSearch = useCommandSearch(open ? query.trim() : "");

  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) {
      setRecentIds(readRecentRouteIds());
      setQuery("");
      setActiveIndex(0);
    }
  }

  useInertOthers(overlayRef, visible);
  useFocusTrap(containerRef, open && mounted);
  useScrollLock(open);
  const { zIndex } = useOverlayStack(visible, overlayRef);

  const sections = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    const matchesQuery = (item) => (
      !normalizedQuery
      || normalizeText(item.label).includes(normalizedQuery)
      || (item.hint && normalizeText(item.hint).includes(normalizedQuery))
    );

    const allowedPages = navigablePages.map(toPageItem);

    const recentItems = normalizedQuery
      ? []
      : recentIds
        .map((id) => allowedPages.find((item) => item.id === id))
        .filter((item) => item && item.path !== pathname);

    const actionItems = actions.map((action) => ({ ...action, type: "action" }));

    let nextIndex = 0;

    return [
      { id: "recent", title: "Son ziyaret edilenler", items: recentItems },
      { id: "pages", title: "Sayfalar", items: allowedPages.filter(matchesQuery) },
      { id: "search", title: appSearch.title ?? "Sonuçlar", items: appSearch.items.map((item) => ({ ...item, type: "page" })) },
      { id: "actions", title: "Aksiyonlar", items: actionItems.filter(matchesQuery) },
    ]
      .filter((section) => section.items.length > 0)
      .map((section) => ({
        ...section,
        items: section.items.map((item) => {
          const index = nextIndex;
          nextIndex += 1;
          return { ...item, index, optionId: `command-palette-${section.id}-${item.id}` };
        }),
      }));
  }, [query, recentIds, pathname, actions, navigablePages, appSearch]);

  const flatItems = sections.flatMap((section) => section.items);
  const activeItem = flatItems[activeIndex];

  useEffect(() => {
    if (!visible || !activeItem) return;
    document.getElementById(activeItem.optionId)?.scrollIntoView({ block: "nearest" });
  }, [visible, activeItem]);

  if (!mounted) return null;

  const handleSelect = (item) => {
    onClose();
    if (item.type === "action") item.perform();
    else navigate(item.path);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev >= flatItems.length - 1 ? 0 : prev + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? flatItems.length - 1 : prev - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeItem) handleSelect(activeItem);
    }
  };

  return (
    <Portal>
      <div
        ref={overlayRef}
        className={cx("command_palette_overlay", open && "command_palette_overlay_open", visible && "command_palette_overlay_show")}
        style={{ zIndex }}
        onClick={onClose}
      >
        <div
          ref={containerRef}
          className={cx("command_palette", visible && "command_palette_show")}
          role="dialog"
          aria-modal="true"
          aria-label="Hızlı arama"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <div className="command_palette_search">
            <FiSearch className="command_palette_search_icon" size={18} aria-hidden="true" />
            <input
              type="text"
              className="command_palette_input"
              placeholder={appSearch.placeholder ?? "Sayfa ya da aksiyon ara..."}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              role="combobox"
              aria-label="Sayfa ya da aksiyon ara"
              aria-autocomplete="list"
              aria-expanded={flatItems.length > 0}
              aria-controls={flatItems.length > 0 ? "command-palette-list" : undefined}
              aria-activedescendant={activeItem?.optionId}
            />
            <Kbd size="sm">Esc</Kbd>
          </div>

          {flatItems.length === 0 ? (
            <p className="command_palette_empty" role="status">{appSearch.loading ? "Aranıyor…" : "Sonuç bulunamadı"}</p>
          ) : (
            <div
              className="command_palette_list"
              id="command-palette-list"
              role="listbox"
              aria-label="Sonuçlar"
            >
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="command_palette_group"
                  role="group"
                  aria-labelledby={`command-palette-group-${section.id}`}
                >
                  <div
                    className="command_palette_group_title"
                    id={`command-palette-group-${section.id}`}
                    role="presentation"
                  >
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.index === activeIndex;

                    return (
                      <div
                        key={item.optionId}
                        id={item.optionId}
                        role="option"
                        aria-selected={isActive}
                        aria-keyshortcuts={item.shortcut ? toAriaKeyShortcut(item.shortcut) : undefined}
                        className={cx("command_palette_item", isActive && "command_palette_item_active")}
                        onMouseMove={() => !isActive && setActiveIndex(item.index)}
                        onClick={() => handleSelect(item)}
                      >
                        {Icon && <Icon className="command_palette_item_icon" aria-hidden="true" />}
                        <span className="command_palette_item_label">{item.label}</span>
                        {item.hint && <span className="command_palette_item_hint">{item.hint}</span>}
                        {item.shortcut && <Kbd size="sm" keys={item.shortcut} className="command_palette_item_shortcut" aria-hidden="true" />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          <div className="command_palette_footer" aria-hidden="true">
            <span className="command_palette_footer_hint">
              <Kbd size="sm">↑</Kbd>
              <Kbd size="sm">↓</Kbd>
              gezin
            </span>
            <span className="command_palette_footer_hint">
              <Kbd size="sm">Enter</Kbd>
              seç
            </span>
            <span className="command_palette_footer_hint">
              <Kbd size="sm">Esc</Kbd>
              kapat
            </span>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default CommandPalette;
