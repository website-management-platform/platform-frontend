import { FiSearch, FiMenu, FiSidebar, FiMoon, FiSun } from "react-icons/fi";
import { useThemeContext } from "@/hooks/useThemeContext";
import Kbd from "@/components/Kbd";
import { MOD_KEY_LABEL, toAriaKeyShortcut } from "@/utils/platform";
import { ContextSwitcher, HeaderActions } from "@/app/routing";
import UserMenu from "../UserMenu";
import "./header.scss";

const Header = ({
  collapsed,
  mobileSidebarOpen = false,
  onToggleCollapse,
  onOpenMobileSidebar,
  onOpenSearch,
}) => {
  const { colorMode, toggleColorMode } = useThemeContext();
  const isDark = colorMode === "dark";

  return (
    <header className="header">
      <button
        type="button"
        className="header_icon_btn header_menu_toggle header_menu_toggle_desktop"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
      >
        <FiSidebar size={19} />
      </button>

      <button
        type="button"
        className="header_icon_btn header_menu_toggle header_menu_toggle_mobile"
        onClick={onOpenMobileSidebar}
        aria-label="Menüyü aç"
        aria-expanded={mobileSidebarOpen}
        aria-controls="app-sidebar"
      >
        <FiMenu size={20} />
      </button>

      {ContextSwitcher && <ContextSwitcher />}

      <button
        type="button"
        className="header_search"
        onClick={onOpenSearch}
        // Erişilebilir ad görünen metni ve kısayolu aynı sırayla içerir (WCAG 2.5.3, sesli komutla seçilebilir).
        aria-label={`Sayfa ya da aksiyon ara, ${MOD_KEY_LABEL} K`}
        aria-keyshortcuts={toAriaKeyShortcut([MOD_KEY_LABEL, "K"])}
      >
        <FiSearch className="header_search_icon" size={16} aria-hidden="true" />
        <span className="header_search_placeholder">Sayfa ya da aksiyon ara...</span>{" "}
        <Kbd className="header_search_kbd" keys={[MOD_KEY_LABEL, "K"]} aria-hidden="true" />
      </button>

      <div className="header_spacer" />

      {HeaderActions && <HeaderActions />}

      <button
        type="button"
        className="header_icon_btn header_theme_toggle"
        onClick={toggleColorMode}
        aria-label={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
      >
        <span className={`header_theme_icon ${isDark ? "header_theme_icon_dark" : ""}`}>
          {isDark ? <FiMoon size={18} /> : <FiSun size={18} />}
        </span>
      </button>

      <UserMenu />
    </header>
  );
};

export default Header;
