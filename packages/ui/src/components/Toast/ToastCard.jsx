import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo, FiBell, FiX } from "react-icons/fi";
import Spinner from "@/components/Spinner";
import { cx } from "@/utils/cx";
import "./toast.scss";

const ICONS = {
  success: FiCheckCircle,
  error: FiXCircle,
  warning: FiAlertTriangle,
  info: FiInfo,
  neutral: FiBell,
};

const ToastCard = ({
  visible,
  position = "top-right",
  variant,
  appearance = "soft",
  size = "md",
  iconStyle = "circle",
  avatar,
  message,
  description,
  action,
  duration,
  showProgress = true,
  closable = true,
  onDismiss,
}) => {
  const Icon = ICONS[variant];
  const isLoading = variant === "loading";
  const progressVisible = showProgress && Number.isFinite(duration) && !isLoading;
  const fromBottom = position.startsWith("bottom");

  let leading = null;
  if (isLoading) {
    leading = <Spinner size="sm" tone="current" decorative />;
  } else if (avatar) {
    leading = avatar;
  } else if (Icon) {
    leading = <Icon className="toast_icon_glyph" />;
  }

  return (
    <div
      className={cx(
        "toast_card",
        `toast_card_${variant}`,
        `toast_card_appearance_${appearance}`,
        `toast_card_${size}`,
        fromBottom && "toast_card_from_bottom",
        visible ? "toast_card_visible" : "toast_card_hidden",
      )}
    >
      {leading && (
        <span
          className={cx("toast_leading", !avatar && `toast_leading_${iconStyle}`)}
          aria-hidden={avatar ? undefined : "true"}
        >
          {leading}
        </span>
      )}
      <div className="toast_content">
        <span className={description ? "toast_title" : "toast_message"}>{message}</span>
        {description && size !== "sm" && <span className="toast_description">{description}</span>}
        {action && <div className="toast_action">{action}</div>}
      </div>
      {closable && !isLoading && (
        <button type="button" className="toast_close" onClick={onDismiss} aria-label="Kapat">
          <FiX aria-hidden="true" />
        </button>
      )}
      {progressVisible && (
        <span
          className="toast_progress"
          style={{ animationDuration: `${duration}ms` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default ToastCard;
