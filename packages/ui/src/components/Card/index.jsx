import { cx } from "@/utils/cx";
import "./card.scss";

const Card = ({
  children,
  title,
  description,
  headingLevel = 3,
  icon: Icon,
  iconTone = "accent",
  actions,
  footer,
  padding = true,
  elevation = "elevated",
  radius = "lg",
  hoverable = false,
  selected,
  clickable = false,
  onClick,
  ariaLabel,
  className = "",
}) => {
  const Heading = `h${headingLevel}`;

  const classes = cx(
    "card",
    `card_${elevation}`,
    `card_radius_${radius}`,
    padding ? "" : "card_no_padding",
    (hoverable || clickable) && "card_hoverable",
    selected && "card_selected",
    clickable ? "card_clickable" : "",
    className,
  );

  const primaryAction = clickable && (
    <button
      type="button"
      className={cx("card_primary_action", !title && "card_primary_action_standalone")}
      onClick={onClick}
      aria-label={title ? undefined : ariaLabel}
      aria-pressed={selected}
    >
      {title}
    </button>
  );

  return (
    <div className={classes}>
      {(title || description || actions || Icon) && (
        <div className="card_header">
          <div className="card_header_row">
            {Icon && (
              <span className={cx("card_icon", `card_icon_${iconTone}`)} aria-hidden="true">
                <Icon />
              </span>
            )}
            <div className="card_heading">
              {title && <Heading className="card_title">{clickable ? primaryAction : title}</Heading>}
              {description && <p className="card_description">{description}</p>}
            </div>
            {actions && <div className="card_actions">{actions}</div>}
          </div>
        </div>
      )}

      {clickable && !title && primaryAction}

      <div className="card_body">{children}</div>

      {footer && <div className="card_footer">{footer}</div>}
    </div>
  );
};

export default Card;
