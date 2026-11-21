import { useEffect, useRef, useState } from "react";
import { Outlet, ScrollRestoration, useLocation, useNavigation } from "react-router";
import { FiCommand, FiMoon, FiSidebar, FiSun } from "react-icons/fi";
import { getRouteTrail } from "@/app/routing";
import { MEDIA_QUERIES, storageKey } from "@/config/app.config";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useRouteTitle } from "@/hooks/usePageTitle";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useThemeContext } from "@/hooks/useThemeContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { MOD_KEY_LABEL } from "@/utils/platform";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import CommandPalette from "./components/CommandPalette";
import ShortcutsDialog from "./components/ShortcutsDialog";
import RouteProgress from "./components/RouteProgress";
import { recordRecentRoute } from "./components/CommandPalette/recentRoutes";
import "./main_layout.scss";

const COLLAPSED_STORAGE_KEY = storageKey("sidebar_collapsed");
const SINGLE_KEY_SHORTCUTS_STORAGE_KEY = storageKey("single_key_shortcuts");

const MainLayout = () => {
  const [collapsed, setCollapsed] = usePersistentState(COLLAPSED_STORAGE_KEY, false);
  const [singleKeyEnabled, setSingleKeyEnabled] = usePersistentState(SINGLE_KEY_SHORTCUTS_STORAGE_KEY, true);
  const [tabletExpanded, setTabletExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const isMobile = useMediaQuery(MEDIA_QUERIES.belowDesktop);
  const isTablet = useMediaQuery(MEDIA_QUERIES.tablet);
  const { colorMode, toggleColorMode } = useThemeContext();
  const mainRef = useRef(null);
  const { pathname } = useLocation();
  const navigation = useNavigation();
  const previousPathnameRef = useRef(pathname);

  let sidebarCollapsed = collapsed;
  if (isMobile) sidebarCollapsed = false;
  else if (isTablet) sidebarCollapsed = !tabletExpanded;

  const sidebarMobileOpen = mobileOpen && isMobile;
  const currentRoute = getRouteTrail(pathname).at(-1);

  useRouteTitle(currentRoute?.label);
  useScrollLock(sidebarMobileOpen);

  const toggleSidebar = () => {
    if (isMobile) setMobileOpen((prev) => !prev);
    else if (isTablet) setTabletExpanded((prev) => !prev);
    else setCollapsed((prev) => !prev);
  };

  const shortcuts = [
    { id: "search", label: "Hızlı arama", key: "k", mod: true, keys: [MOD_KEY_LABEL, "K"], handler: () => setSearchOpen(true) },
    { id: "sidebar", label: "Menüyü daralt / genişlet", key: "b", mod: true, keys: [MOD_KEY_LABEL, "B"], handler: toggleSidebar },
    { id: "shortcuts", label: "Klavye kısayolları", key: "/", mod: true, keys: [MOD_KEY_LABEL, "/"], handler: () => setShortcutsOpen(true) },
    { id: "shortcuts-single-key", label: "Klavye kısayolları (tek tuş)", key: "?", keys: ["?"], handler: () => setShortcutsOpen(true) },
  ];

  const paletteActions = [
    {
      id: "toggle-theme",
      label: colorMode === "dark" ? "Açık temaya geç" : "Koyu temaya geç",
      icon: colorMode === "dark" ? FiSun : FiMoon,
      perform: toggleColorMode,
    },
    {
      id: "toggle-sidebar",
      label: sidebarCollapsed ? "Menüyü genişlet" : "Menüyü daralt",
      icon: FiSidebar,
      shortcut: [MOD_KEY_LABEL, "B"],
      perform: toggleSidebar,
    },
    {
      id: "show-shortcuts",
      label: "Klavye kısayollarını göster",
      icon: FiCommand,
      shortcut: [MOD_KEY_LABEL, "/"],
      perform: () => setShortcutsOpen(true),
    },
  ];

  useKeyboardShortcuts(shortcuts, { singleKeyEnabled });

  useEffect(() => {
    if (currentRoute) recordRecentRoute(currentRoute.id);
  }, [currentRoute]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    const { activeElement } = document;
    if (activeElement !== document.body && mainRef.current?.contains(activeElement)) return;
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  const handleSkipToContent = (event) => {
    event.preventDefault();
    mainRef.current?.focus();
  };

  return (
    <div className={`main_layout ${sidebarCollapsed ? "main_layout_collapsed" : ""}`}>
      <a href="#main-content" className="main_layout_skip_link" onClick={handleSkipToContent}>
        İçeriğe atla
      </a>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={sidebarMobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="main_layout_content_area" inert={sidebarMobileOpen}>
        <Header
          collapsed={sidebarCollapsed}
          mobileSidebarOpen={sidebarMobileOpen}
          onToggleCollapse={toggleSidebar}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <main id="main-content" ref={mainRef} tabIndex={-1} className="main_layout_content">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} actions={paletteActions} />
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        shortcuts={shortcuts}
        singleKeyEnabled={singleKeyEnabled}
        onSingleKeyEnabledChange={setSingleKeyEnabled}
      />
      {navigation.state === "loading" && <RouteProgress />}
      <ScrollRestoration />
    </div>
  );
};

export default MainLayout;
