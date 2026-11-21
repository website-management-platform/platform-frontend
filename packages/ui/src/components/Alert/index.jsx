import { useEffect, useRef, useState } from "react";
import { FiInfo, FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiX } from "react-icons/fi";
import { cx } from "@/utils/cx";
import { readDuration } from "@/utils/motion";
import { keepFocusAfterRemoval } from "@/utils/focus";
import "./alert.scss";

const ICONS = {
  info: FiInfo,
  success: FiCheckCircle,
  warning: FiAlertTriangle,
  danger: FiAlertCircle,
  neutral: FiInfo,
};

const Alert = ({
  variant = "info",
  appearance = "soft",
  size = "default",
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  autoClose,
  action,
  className = "",
}) => {
  const [closing, setClosing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [paused, setPaused] = useState(false);
  const alertRef = useRef(null);
  const Icon = icon === false ? null : (icon ?? ICONS[variant]);

  const classes = cx(
    "alert",
    `alert_${variant}`,
    `alert_${appearance}`,
    `alert_${size}`,
    closing ? "alert_closing" : "",
    className,
  );

  useEffect(() => {
    if (!closing) return undefined;
    const timer = setTimeout(() => {
      keepFocusAfterRemoval(alertRef.current);
      setDismissed(true);
      onDismiss?.();
    }, readDuration("--app-duration-base"));
    return () => clearTimeout(timer);
  }, [closing, onDismiss]);

  useEffect(() => {
    if (!autoClose || paused) return undefined;
    const timer = setTimeout(() => setClosing(true), autoClose);
    return () => clearTimeout(timer);
  }, [autoClose, paused]);

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
  };

  if (dismissed) return null;

  return (
    <div
      ref={alertRef}
      className={classes}
      role={variant === "danger" ? "alert" : "status"}
      onMouseEnter={autoClose ? () => setPaused(true) : undefined}
      onMouseLeave={autoClose ? () => setPaused(false) : undefined}
      onFocus={autoClose ? () => setPaused(true) : undefined}
      onBlur={autoClose ? handleBlur : undefined}
    >
      {Icon && <Icon className="alert_icon" aria-hidden="true" />}
      <div className="alert_content">
        {title && <div className="alert_title">{title}</div>}
        {children && <div className="alert_description">{children}</div>}
        {action && <div className="alert_action">{action}</div>}
      </div>
      {dismissible && (
        <button type="button" className="alert_dismiss" onClick={() => setClosing(true)} aria-label="Kapat">
          <FiX size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
