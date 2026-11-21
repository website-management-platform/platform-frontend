import { Outlet, ScrollRestoration } from "react-router";
import { APP_NAME, APP_SHORT_NAME } from "@/config/app.config";
import "./auth_layout.scss";

const AuthLayout = () => (
  <div className="auth_layout">
    <main id="main-content" className="auth_layout_main" tabIndex={-1}>
      <div className="auth_layout_brand_row">
        <span className="auth_layout_mark" aria-hidden="true">{APP_SHORT_NAME}</span>
        <span className="auth_layout_app_name">{APP_NAME}</span>
      </div>
      <div className="auth_layout_panel">
        <Outlet />
      </div>
      <p className="auth_layout_footer">© {new Date().getFullYear()} {APP_NAME}</p>
    </main>
    <ScrollRestoration />
  </div>
);

export default AuthLayout;
