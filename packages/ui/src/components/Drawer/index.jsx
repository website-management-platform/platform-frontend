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
import "./drawer.scss";

const Drawer = ({
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
  placement = "right",
  size = "md",
  variant = "flush",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  busy = false,
  beforeClose,
  ariaLabel,
  ariaDescribedBy,
  initialFocusRef,
}) => {
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const bodyRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const { mounted, visible } = usePresence(open, "--app-duration-base");
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
  useScrollEdges(bodyRef, containerRef, visible);
  const { zIndex } = useOverlayStack(visible, overlayRef);

  if (!mounted) return null;

  const describedBy = cx(description && descriptionId, ariaDescribedBy) || undefined;
  const hasFooter = Boolean(footer || footerStart);

  return (
    <Portal>
      <div
        ref={overlayRef}
        className={cx("drawer_overlay", visible && "drawer_overlay_show")}
        style={{ zIndex }}
        {...overlayProps}
      >
        <div
          ref={containerRef}
          className={cx(
            "drawer",
            `drawer_${placement}`,
            `drawer_${size}`,
            `drawer_${variant}`,
            visible && "drawer_show",
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : ariaLabel}
          aria-describedby={describedBy}
          aria-busy={locked || undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <div className={cx("drawer_header", subheader && "drawer_header_with_subheader")}>
            <div className="drawer_header_row">
              {Icon && (
                <span className={cx("drawer_icon", `drawer_icon_${iconTone}`)} aria-hidden="true">
                  <Icon />
                </span>
              )}
              <div className="drawer_heading">
                {title && <h2 className="drawer_title" id={titleId}>{title}</h2>}
                {description && <p className="drawer_description" id={descriptionId}>{description}</p>}
              </div>
              {headerActions && <div className="drawer_header_actions">{headerActions}</div>}
              <button
                type="button"
                className="drawer_close"
                onClick={() => requestClose("close_button")}
                disabled={locked}
                aria-label="Kapat"
                data-focus-fallback=""
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
            {subheader && <div className="drawer_subheader">{subheader}</div>}
          </div>

          <div ref={bodyRef} className="drawer_body">{children}</div>

          {hasFooter && (
            <div className={cx("drawer_footer", `drawer_footer_${footerAlign}`)}>
              {footerStart && <div className="drawer_footer_start">{footerStart}</div>}
              {footer && <div className="drawer_footer_actions">{footer}</div>}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
};

export default Drawer;
