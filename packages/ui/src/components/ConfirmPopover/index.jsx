import { useId, useState } from "react";
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiHelpCircle, FiInfo } from "react-icons/fi";
import Popover from "@/components/Popover";
import Button from "@/components/Button";
import { cx } from "@/utils/cx";
import "./confirm_popover.scss";
import { getErrorMessage, isApiError } from "@/api/errors";

const VARIANT_CONFIG = {
  default: { icon: FiHelpCircle, tone: "accent", buttonColor: "primary" },
  info: { icon: FiInfo, tone: "accent", buttonColor: "accent" },
  destructive: { icon: FiAlertCircle, tone: "danger", buttonColor: "danger" },
  warning: { icon: FiAlertTriangle, tone: "warning", buttonColor: "warning" },
  success: { icon: FiCheckCircle, tone: "success", buttonColor: "success" },
};

const ConfirmPopover = ({
  trigger,
  title = "Emin misiniz?",
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  variant = "default",
  icon,
  layout = "side",
  placement = "bottom",
  onConfirm,
  onCancel,
  closeOnConfirm = true,
  disabled = false,
  errorFallback = "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const descriptionId = useId();
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.default;
  const Icon = icon === false || layout === "compact" ? null : (icon ?? config.icon);

  if (disabled) {
    return trigger({ open: false, toggle: () => {}, triggerProps: { "aria-disabled": true } });
  }

  const handleConfirm = async (close) => {
    setError("");
    setLoading(true);
    try {
      const result = await onConfirm?.();
      if (result !== false && closeOnConfirm) close();
    } catch (caughtError) {
      setError(isApiError(caughtError) ? getErrorMessage(caughtError) : errorFallback);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (close) => {
    setError("");
    close();
    onCancel?.();
  };

  return (
    <Popover
      trigger={trigger}
      placement={placement}
      size="md"
      dismissible={!loading}
      ariaLabel={title}
      ariaDescribedBy={description ? descriptionId : undefined}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setError("");
      }}
    >
      {({ close }) => (
        <div
          className={cx("confirm_popover", `confirm_popover_tone_${config.tone}`)}
          aria-busy={loading || undefined}
        >
          {Icon && (
            <span className="confirm_popover_icon" aria-hidden="true">
              <Icon />
            </span>
          )}
          <div className="confirm_popover_content">
            <p className="confirm_popover_title">{title}</p>
            {description && <p className="confirm_popover_description" id={descriptionId}>{description}</p>}
            {error && <p className="confirm_popover_error" role="alert">{error}</p>}
            <div className="confirm_popover_actions">
              <Button size="sm" variant="ghost" color="neutral" onClick={() => handleCancel(close)} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button size="sm" color={config.buttonColor} onClick={() => handleConfirm(close)} loading={loading}>
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Popover>
  );
};

export default ConfirmPopover;
