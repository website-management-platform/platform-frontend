import { FiCommand } from "react-icons/fi";
import Modal from "@/components/Modal";
import Kbd from "@/components/Kbd";
import Switch from "@/components/Switch";
import { cx } from "@/utils/cx";
import "./shortcuts_dialog.scss";

const ShortcutsDialog = ({ open, onClose, shortcuts, singleKeyEnabled, onSingleKeyEnabledChange }) => (
  <Modal
    open={open}
    onClose={onClose}
    title="Klavye kısayolları"
    description="Paneli fareye uzanmadan, klavyeyle daha hızlı kullanın."
    icon={FiCommand}
    iconTone="neutral"
    size="lg"
  >
    <ul className="shortcuts_dialog_list">
      {shortcuts.map((shortcut) => {
        const inactive = !shortcut.mod && !singleKeyEnabled;
        return (
          <li key={shortcut.id} className={cx("shortcuts_dialog_item", inactive && "shortcuts_dialog_item_inactive")}>
            <span className="shortcuts_dialog_label">
              {shortcut.label}
              {inactive && <span className="shortcuts_dialog_status"> (kapalı)</span>}
            </span>
            <Kbd keys={shortcut.keys} />
          </li>
        );
      })}
    </ul>
    <div className="shortcuts_dialog_setting">
      <Switch
        label="Tek tuşlu kısayollar"
        description="Kapatıldığında yalnızca ⌘ / Ctrl ile birlikte kullanılan kısayollar çalışır."
        checked={singleKeyEnabled}
        onChange={(event) => onSingleKeyEnabledChange(event.target.checked)}
      />
    </div>
  </Modal>
);

export default ShortcutsDialog;
