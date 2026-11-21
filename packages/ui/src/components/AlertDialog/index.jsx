import { useId, useRef, useState } from "react";
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiHelpCircle, FiInfo, FiX } from "react-icons/fi";
import Portal from "@/components/Portal";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useInertOthers } from "@/hooks/useInertOthers";
import { useOverlayStack } from "@/hooks/useOverlayStack";
import { usePresence } from "@/hooks/usePresence";
import { cx } from "@/utils/cx";
import "./alert_dialog.scss";

const VARIANT_CONFIG = {
  default: { icon: FiHelpCircle, tone: "accent", buttonColor: "primary" },
  info: { icon: FiInfo, tone: "accent", buttonColor: "accent" },
  destructive: { icon: FiAlertCircle, tone: "danger", buttonColor: "danger" },
  warning: { icon: FiAlertTriangle, tone: "warning", buttonColor: "warning" },
  success: { icon: FiCheckCircle, tone: "success", buttonColor: "success" },
};

const AlertDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  ariaLabel = "Onay iletişim kutusu",
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  variant = "default",
  layout = "centered",
  iconAppearance = "soft",
  icon,
  size = "sm",
  actionsLayout = "inline",
  closeButton = false,
  loading = false,
  error,
  requireConfirmText,
  children,
}) => {
  const [typedText, setTypedText] = useState("");
  const [previousOpen, setPreviousOpen] = useState(open);
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.default;
  const Icon = icon === false ? null : (icon ?? config.icon);
  const { mounted, visible } = usePresence(open, "--app-duration-base");

  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) setTypedText("");
  }

  useInertOthers(overlayRef, visible);
  useFocusTrap(dialogRef, visible, { initialFocusRef: requireConfirmText ? undefined : cancelRef });
  useScrollLock(open);
  const { zIndex } = useOverlayStack(visible, overlayRef);

  if (!mounted) return null;

  const confirmDisabled = Boolean(requireConfirmText) && typedText !== requireConfirmText;

  const handleKeyDown = (event) => {
    if (event.key !== "Escape" || event.nativeEvent.isComposing || loading) return;
    event.stopPropagation();
    onClose?.();
  };

  const iconElement = Icon && (
    <span className={cx("alert_dialog_icon", `alert_dialog_icon_${iconAppearance}`)} aria-hidden="true">
      <Icon />
    </span>
  );

  const heading = (
    <div className="alert_dialog_heading">
      {title && <h2 className="alert_dialog_title" id={titleId}>{title}</h2>}
      {description && <p className="alert_dialog_description" id={descriptionId}>{description}</p>}
    </div>
  );

  return (
    <Portal>
      <div
        ref={overlayRef}
        className={cx("alert_dialog_overlay", visible && "alert_dialog_overlay_show")}
        style={{ zIndex }}
      >
        <div
          ref={dialogRef}
          className={cx(
            "alert_dialog",
            `alert_dialog_${layout}`,
            `alert_dialog_${size}`,
            `alert_dialog_tone_${config.tone}`,
            visible && "alert_dialog_show",
          )}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : ariaLabel}
          aria-describedby={description ? descriptionId : undefined}
          aria-busy={loading || undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {closeButton && (
            <button
              type="button"
              className="alert_dialog_close"
              onClick={onClose}
              disabled={loading}
              aria-label="Kapat"
              data-focus-fallback=""
            >
              <FiX aria-hidden="true" />
            </button>
          )}

          {layout === "banner" && <div className="alert_dialog_banner">{iconElement}</div>}

          <div className="alert_dialog_main">
            {layout === "side" ? (
              <div className="alert_dialog_side_row">
                {iconElement}
                {heading}
              </div>
            ) : (
              <>
                {layout === "centered" && iconElement}
                {heading}
              </>
            )}

            {children && <div className="alert_dialog_extra">{children}</div>}

            {requireConfirmText && (
              <div className="alert_dialog_extra">
                <Input
                  label={`Onaylamak için "${requireConfirmText}" yazın`}
                  value={typedText}
                  onChange={(event) => setTypedText(event.target.value)}
                  autoComplete="off"
                />
              </div>
            )}

            {error && <p className="alert_dialog_error" role="alert">{error}</p>}

            <div className={cx("alert_dialog_actions", `alert_dialog_actions_${actionsLayout}`)}>
              <Button
                ref={cancelRef}
                variant="outline"
                color="neutral"
                onClick={onClose}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
              <Button
                variant="solid"
                color={config.buttonColor}
                onClick={() => onConfirm?.()}
                loading={loading}
                disabled={confirmDisabled}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default AlertDialog;
