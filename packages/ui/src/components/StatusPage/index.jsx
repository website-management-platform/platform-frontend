import CopyButton from "@/components/CopyButton";
import { cx } from "@/utils/cx";
import "./status_page.scss";

// Tam sayfa durum ekranı (hata, bulunamadı, yetki yok): ne olduğunu, ne yapılacağını ve gerekirse destek kodunu
// tek kartta söyler. `tone` ikonun rengidir; `code` küçük üst etikettir (ör. "Hata 404").
const StatusPage = ({ icon: Icon, tone = "accent", code, title, description, actions, traceId, children }) => (
  <div className="status_page">
    <section className={cx("status_page_card", `status_page_tone_${tone}`)} aria-labelledby="status-page-title">
      {Icon && (
        <span className="status_page_icon" aria-hidden="true">
          <Icon />
        </span>
      )}
      {code && <p className="status_page_code">{code}</p>}
      <h1 className="status_page_title" id="status-page-title">{title}</h1>
      {description && <p className="status_page_description">{description}</p>}
      {children}
      {actions && <div className="status_page_actions">{actions}</div>}
      {traceId && (
        <div className="status_page_support">
          <span>
            Destek kodu: <code>{traceId}</code>
          </span>
          <CopyButton value={traceId} size="sm" variant="ghost" />
        </div>
      )}
    </section>
  </div>
);

export default StatusPage;
