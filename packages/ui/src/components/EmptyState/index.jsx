import { cx } from "@/utils/cx";
import "./empty_state.scss";

const EmptyState = ({
  icon: Icon,
  title,
  headingLevel = 3,
  description,
  action,
  secondaryAction,
  variant = "plain",
  size = "md",
  tone = "neutral",
  className = "",
}) => {
  const Heading = `h${headingLevel}`;
  const classes = cx("empty_state", `empty_state_${variant}`, `empty_state_${size}`, className);

  return (
    <div className={classes}>
      {Icon && (
        <span className={cx("empty_state_icon", `empty_state_tone_${tone}`)}>
          <Icon aria-hidden="true" />
        </span>
      )}
      {title && <Heading className="empty_state_title">{title}</Heading>}
      {description && <p className="empty_state_description">{description}</p>}
      {(action || secondaryAction) && (
        <div className="empty_state_actions">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
