import { Link, useLocation } from "react-router";
import { FiArrowLeft } from "react-icons/fi";
import Breadcrumb from "@/components/Breadcrumb";
import { getRouteTrail, resolveItemPath, useHomeCrumb } from "@/app/routing";
import { cx } from "@/utils/cx";
import "./page_header.scss";

const useRouteBreadcrumb = (enabled) => {
  const { pathname } = useLocation();
  const homeCrumb = useHomeCrumb();
  if (!enabled) return [];
  const trail = getRouteTrail(pathname).map((item) => ({ label: item.label, path: resolveItemPath(item, pathname) }));
  return trail[0]?.path === homeCrumb.path ? trail : [homeCrumb, ...trail];
};

const PageHeader = ({
  title,
  headingLevel = 1,
  description,
  breadcrumb,
  backTo,
  badge,
  actions,
  size = "default",
  divider = false,
  className = "",
}) => {
  const Heading = `h${headingLevel}`;
  const routeBreadcrumb = useRouteBreadcrumb(breadcrumb === true);
  const breadcrumbItems = Array.isArray(breadcrumb) ? breadcrumb : routeBreadcrumb;

  return (
    <header className={cx("page_header", `page_header_${size}`, divider && "page_header_divider", className)}>
      {breadcrumbItems.length > 1 && <Breadcrumb items={breadcrumbItems} />}
      {backTo && (
        <Link to={backTo.to} className="page_header_back">
          <FiArrowLeft aria-hidden="true" />
          {backTo.label}
        </Link>
      )}
      <div className="page_header_main">
        <div className="page_header_heading">
          <div className="page_header_title_row">
            <Heading className="page_header_title">{title}</Heading>
            {badge}
          </div>
          {description && <p className="page_header_description">{description}</p>}
        </div>
        {actions && <div className="page_header_actions">{actions}</div>}
      </div>
    </header>
  );
};

export default PageHeader;
