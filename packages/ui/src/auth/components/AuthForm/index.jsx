import { Link } from "react-router";
import "./auth_form.scss";

const AuthForm = ({ onSubmit, ariaLabel, children }) => (
  <form className="auth_form" onSubmit={onSubmit} noValidate aria-label={ariaLabel}>
    {children}
  </form>
);

export const AuthFooter = ({ text, linkLabel, to }) => (
  <p className="auth_footer">
    {text}
    {" "}
    <Link to={to} className="auth_footer_link">{linkLabel}</Link>
  </p>
);

export default AuthForm;
