import { useId, useState } from "react";
import { FiChevronDown, FiUser } from "react-icons/fi";
import { storageKey } from "@/config/app.config";
import { IS_DEV_TOOLS, useDemoAccounts } from "@/devtools/api";
import { cx } from "@/utils/cx";
import "./demo_accounts.scss";

const OPEN_STORAGE_KEY = storageKey("demo_accounts_open");

const readOpen = () => {
  try {
    return window.localStorage.getItem(OPEN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

const writeOpen = (value) => {
  try {
    window.localStorage.setItem(OPEN_STORAGE_KEY, String(value));
  } catch {
    return;
  }
};

// Yalnız geliştirme: backend'in yerel profilindeki örnek hesaplar (/__dev/demo-accounts). Üretimde hiçbir şey çizmez.
const DemoAccounts = ({ onSelect }) => {
  const accountsQuery = useDemoAccounts();
  const panelId = useId();
  const [open, setOpen] = useState(readOpen);
  if (!IS_DEV_TOOLS || !accountsQuery.data) return null;

  const { accounts, password } = accountsQuery.data;

  const toggle = () => setOpen((value) => {
    writeOpen(!value);
    return !value;
  });

  return (
    <section className={cx("demo_accounts", open && "demo_accounts_open")} aria-labelledby={`${panelId}-title`}>
      <h2 className="demo_accounts_heading">
        <button type="button" className="demo_accounts_toggle" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
          <span className="demo_accounts_header">
            <span className="demo_accounts_title" id={`${panelId}-title`}>Demo hesapları</span>
            <span className="demo_accounts_hint">
              Geliştirme ortamı · {accounts.length} hesap · Ortak şifre: <code>{password}</code>
            </span>
          </span>
          <FiChevronDown className="demo_accounts_chevron" aria-hidden="true" />
        </button>
      </h2>
      <div className="demo_accounts_panel" id={panelId} inert={!open}>
        <div className="demo_accounts_panel_inner">
          <ul className="demo_accounts_list">
            {accounts.map((account) => (
              <li key={account.email}>
                <button type="button" className="demo_accounts_item" onClick={() => onSelect({ email: account.email, password })}>
                  <FiUser className="demo_accounts_icon" aria-hidden="true" />
                  <span className="demo_accounts_text">
                    <span className="demo_accounts_email">{account.email}</span>
                    <span className="demo_accounts_description">{account.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default DemoAccounts;
