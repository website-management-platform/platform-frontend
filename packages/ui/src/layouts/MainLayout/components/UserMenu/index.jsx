import { useNavigate } from "react-router";
import { FiChevronDown, FiLogOut, FiShield } from "react-icons/fi";
import Avatar from "@/components/Avatar";
import Dropdown, { DropdownDivider, DropdownItem, DropdownLabel } from "@/components/Dropdown";
import { toast } from "@/components/Toast/toast";
import { useCurrentUser, useLogout } from "@/auth/api";
import "./user_menu.scss";

export const ACCOUNT_SECURITY_PATH = "/hesap/guvenlik";

const UserMenu = () => {
  const user = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  if (!user) return null;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate("/giris", { replace: true }),
      onError: () => toast.warning("Sunucuya ulaşılamadı; bu cihazdaki oturum kapatıldı."),
    });
  };

  return (
    <Dropdown
      placement="bottom_end"
      trigger={({ toggle, triggerProps }) => (
        <button type="button" className="user_menu_trigger" onClick={toggle} aria-label={`Hesap menüsü, ${user.displayName}`} {...triggerProps}>
          <Avatar name={user.displayName} size="sm" />
          <span className="user_menu_name">{user.displayName}</span>
          <FiChevronDown className="user_menu_chevron" aria-hidden="true" />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>
            <span className="user_menu_label_name">{user.displayName}</span>
            <span className="user_menu_label_email">{user.email}</span>
          </DropdownLabel>
          <DropdownDivider />
          <DropdownItem icon={FiShield} onClick={() => { close(); navigate(ACCOUNT_SECURITY_PATH); }}>Hesap güvenliği</DropdownItem>
          <DropdownItem icon={FiLogOut} danger onClick={() => { close(); handleLogout(); }}>Çıkış yap</DropdownItem>
        </>
      )}
    </Dropdown>
  );
};

export default UserMenu;
