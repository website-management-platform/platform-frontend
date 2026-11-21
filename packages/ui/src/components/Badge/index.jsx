import { useRef } from "react";
import { FiX } from "react-icons/fi";
import { keepFocusAfterRemoval } from "@/utils/focus";
import { cx } from "@/utils/cx";
import "./badge.scss";

const Badge = ({
  children,
  variant = "neutral",
  appearance,
  size = "md",
  shape = "pill",
  dot = false,
  outline = false,
  icon: Icon,
  iconPosition = "left",
  max,
  closable = false,
  onClose,
  closeLabel = "Kaldır",
  className = "",
}) => {
  const badgeRef = useRef(null);
  const resolvedAppearance = appearance ?? (outline ? "outline" : "soft");
  const isIconOnly = Boolean(Icon) && !children;

  const classes = cx(
    "badge",
    `badge_${variant}`,
    `badge_appearance_${resolvedAppearance}`,
    `badge_${size}`,
    `badge_${shape}`,
    isIconOnly && "badge_icon_only",
    className,
  );

  const content = typeof children === "number" && max !== undefined && children > max
    ? `${max}+`
    : children;

  return (
    <span ref={badgeRef} className={classes}>
      {dot && <span className="badge_dot" aria-hidden="true" />}
      {Icon && iconPosition === "left" && <Icon className="badge_icon" aria-hidden="true" />}
      {content !== undefined && content !== null && <span className="badge_label">{content}</span>}
      {Icon && iconPosition === "right" && <Icon className="badge_icon" aria-hidden="true" />}
      {closable && (
        <button
          type="button"
          className="badge_close"
          onClick={(event) => {
            keepFocusAfterRemoval(badgeRef.current);
            onClose?.(event);
          }}
          aria-label={closeLabel}
        >
          <FiX aria-hidden="true" />
        </button>
      )}
    </span>
  );
};

export default Badge;
