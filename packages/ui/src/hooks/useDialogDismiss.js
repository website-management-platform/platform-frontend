import { useRef, useState } from "react";

export const useDialogDismiss = ({
  onClose,
  beforeClose,
  busy = false,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  const [closePending, setClosePending] = useState(false);
  const pointerDownOnOverlayRef = useRef(false);
  const locked = busy || closePending;

  const requestClose = async (reason) => {
    if (locked) return;
    if (beforeClose) {
      setClosePending(true);
      let canClose;
      try {
        canClose = await beforeClose(reason);
      } catch {
        canClose = false;
      } finally {
        setClosePending(false);
      }
      if (!canClose) return;
    }
    onClose?.(reason);
  };

  const handleOverlayMouseDown = (event) => {
    pointerDownOnOverlayRef.current = event.target === event.currentTarget;
  };

  const handleOverlayClick = (event) => {
    const startedOnOverlay = pointerDownOnOverlayRef.current;
    pointerDownOnOverlayRef.current = false;
    if (!closeOnOverlayClick || !startedOnOverlay || event.target !== event.currentTarget) return;
    requestClose("overlay");
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Escape" || event.nativeEvent.isComposing || !closeOnEscape) return;
    event.stopPropagation();
    requestClose("escape");
  };

  return {
    locked,
    requestClose,
    handleKeyDown,
    overlayProps: {
      onMouseDown: handleOverlayMouseDown,
      onClick: handleOverlayClick,
    },
  };
};
