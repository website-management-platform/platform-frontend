import { cx } from "@/utils/cx";
import "./auth_header.scss";

const AuthHeader = ({ icon: Icon, tone = "accent", title, description }) => (
  <div className="auth_header">
    {Icon && (
      <span className={cx("auth_header_icon", `auth_header_icon_${tone}`)} aria-hidden="true">
        <Icon />
      </span>
    )}
    <h1 className="auth_header_title">{title}</h1>
    {description && <p className="auth_header_description">{description}</p>}
  </div>
);

export default AuthHeader;
