import { cx } from "@/utils/cx";
import "./button.scss";

const DEFAULT_COLORS = {
  solid: "primary",
  soft: "primary",
  outline: "neutral",
  ghost: "neutral",
  link: "accent",
};

const Spinner = () => (
  <span className="button_spinner" aria-hidden="true" />
);

const Button = ({
  children,
  variant = "solid",
  color,
  size = "md",
  radius = "md",
  icon: Icon,
  iconPosition = "left",
  fullWidth = false,
  loading = false,
  disabled = false,
  type = "button",
  as = "button",
  href,
  ariaLabel,
  onClick,
  className = "",
  ...rest
}) => {
  const resolvedColor = color ?? DEFAULT_COLORS[variant] ?? "primary";
  const isIconOnly = Boolean(Icon) && !children;
  const classes = cx(
    "button",
    `button_${variant}`,
    `button_color_${resolvedColor}`,
    `button_${size}`,
    `button_radius_${radius}`,
    fullWidth && "button_full_width",
    loading && "button_loading",
    isIconOnly && "button_icon_only",
    className,
  );

  const content = (
    <>
      {loading && <Spinner />}
      {!loading && Icon && iconPosition === "left" && (
        <Icon className="button_icon" aria-hidden="true" />
      )}
      {children && <span className="button_label">{children}</span>}
      {!loading && Icon && iconPosition === "right" && (
        <Icon className="button_icon" aria-hidden="true" />
      )}
    </>
  );

  const preventAction = (event) => event.preventDefault();

  const commonProps = {
    className: classes,
    "aria-label": isIconOnly ? ariaLabel : undefined,
    "aria-busy": loading || undefined,
    onClick: disabled || loading ? preventAction : onClick,
    ...rest,
  };

  if (as !== "button") {
    const LinkComponent = as;

    return (
      <LinkComponent
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        {...commonProps}
      >
        {content}
      </LinkComponent>
    );
  }

  return (
    <button type={type} disabled={disabled} aria-disabled={loading || undefined} {...commonProps}>
      {content}
    </button>
  );
};

export default Button;
