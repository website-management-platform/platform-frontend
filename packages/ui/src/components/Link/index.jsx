import { Link as RouterLink } from "react-router";
import { FiExternalLink } from "react-icons/fi";
import { cx } from "@/utils/cx";
import "./link.scss";

const EXTERNAL_PATTERN = /^(https?:|mailto:|tel:|\/\/)/;
const NEW_TAB_PATTERN = /^(https?:|\/\/)/;

const Link = ({
  to,
  href,
  external,
  variant = "default",
  underline,
  showExternalIcon = true,
  className = "",
  children,
  ...rest
}) => {
  const resolvedUnderline = underline ?? (variant === "default" ? "always" : "hover");
  const target = to ?? href;
  const isExternal = external ?? (typeof target === "string" && EXTERNAL_PATTERN.test(target));
  const classes = cx("link", `link_${variant}`, `link_underline_${resolvedUnderline}`, className);

  if (isExternal) {
    const opensNewTab = typeof target === "string" && NEW_TAB_PATTERN.test(target);

    return (
      <a
        href={target}
        className={classes}
        target={opensNewTab ? "_blank" : undefined}
        rel={opensNewTab ? "noopener noreferrer" : undefined}
        {...rest}
      >
        {children}
        {opensNewTab && showExternalIcon && <FiExternalLink className="link_external_icon" aria-hidden="true" />}
        {opensNewTab && <span className="visually_hidden"> (yeni sekmede açılır)</span>}
      </a>
    );
  }

  return (
    <RouterLink to={target} className={classes} {...rest}>
      {children}
    </RouterLink>
  );
};

export default Link;
