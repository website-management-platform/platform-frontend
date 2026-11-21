import { useId, useRef } from "react";
import { FiX } from "react-icons/fi";
import Portal from "@/components/Portal";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useInertOthers } from "@/hooks/useInertOthers";
import { useOverlayStack } from "@/hooks/useOverlayStack";
import { usePresence } from "@/hooks/usePresence";
import { useScrollEdges } from "@/hooks/useScrollEdges";
import { useDialogDismiss } from "@/hooks/useDialogDismiss";
import { cx } from "@/utils/cx";
import "./modal.scss";

const Modal = ({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  iconTone = "accent",
  headerActions,
  subheader,
  children,
  footer,
  footerStart,
  footerAlign = "end",
  size = "md",
  centered = true,
  scrollBehavior = "inside",
  mobileLayout = "sheet",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  busy = false,
  beforeClose,
  role = "dialog",
  ariaLabel,
  ariaDescribedBy,
  initialFocusRef,
}) => {
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const bodyRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const { mounted, visible } = usePresence(open, "--app-duration-slow");
  const { locked, requestClose, handleKeyDown, overlayProps } = useDialogDismiss({
    onClose,
    beforeClose,
    busy,
    closeOnOverlayClick,
    closeOnEscape,
  });

  useInertOthers(overlayRef, visible);
  useFocusTrap(containerRef, visible, { initialFocusRef });
  useScrollLock(open);
  useScrollEdges(scrollBehavior === "inside" ? bodyRef : overlayRef, containerRef, visible);
  const { zIndex } = useOverlayStack(visible, overlayRef);

  if (!mounted) return null;

  const describedBy = cx(description && descriptionId, ariaDescribedBy) || undefined;
  const hasFooter = Boolean(footer || footerStart);

  return (
    <Portal>
      <div
        ref={overlayRef}
        className={cx(
          "modal_overlay",
          visible && "modal_overlay_show",
          !centered && "modal_overlay_top",
          size === "full" && "modal_overlay_full",
          scrollBehavior === "outside" && "modal_overlay_scroll",
          `modal_overlay_mobile_${mobileLayout}`,
        )}
        style={{ zIndex }}
        {...overlayProps}
      >
        <div
          ref={containerRef}
          className={cx("modal", `modal_${size}`, visible && "modal_show")}
          role={role}
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : ariaLabel}
          aria-describedby={describedBy}
          aria-busy={locked || undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <div className={cx("modal_header", subheader && "modal_header_with_subheader")}>
            <div className="modal_header_row">
              {Icon && (
                <span className={cx("modal_icon", `modal_icon_${iconTone}`)} aria-hidden="true">
                  <Icon />
                </span>
              )}
              <div className="modal_heading">
                {title && <h2 className="modal_title" id={titleId}>{title}</h2>}
                {description && <p className="modal_description" id={descriptionId}>{description}</p>}
              </div>
              {headerActions && <div className="modal_header_actions">{headerActions}</div>}
              <button
                type="button"
                className="modal_close"
                onClick={() => requestClose("close_button")}
                disabled={locked}
                aria-label="Kapat"
                data-focus-fallback=""
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
            {subheader && <div className="modal_subheader">{subheader}</div>}
          </div>

          <div ref={bodyRef} className="modal_body">{children}</div>

          {hasFooter && (
            <div className={cx("modal_footer", `modal_footer_${footerAlign}`)}>
              {footerStart && <div className="modal_footer_start">{footerStart}</div>}
              {footer && <div className="modal_footer_actions">{footer}</div>}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
};

export default Modal;
