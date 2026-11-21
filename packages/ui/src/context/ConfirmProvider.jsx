import { useCallback, useRef, useState } from "react";
import AlertDialog from "@/components/AlertDialog";
import { ConfirmContext } from "@/context/ConfirmContext";
import { getErrorMessage, isApiError } from "@/api/errors";

const DEFAULT_ERROR = "İşlem tamamlanamadı. Lütfen tekrar deneyin.";

const ConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState({ open: false, options: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => new Promise((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    setError("");
    setDialog({ open: true, options });
  }), []);

  const settle = (result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog((prev) => ({ ...prev, open: false }));
  };

  const handleConfirm = async () => {
    const { onConfirm } = dialog.options;
    if (!onConfirm) {
      settle(true);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onConfirm();
      settle(true);
    } catch (caughtError) {
      if (isApiError(caughtError)) setError(getErrorMessage(caughtError));
      else if (isApiError(caughtError?.cause) && caughtError.message) setError(caughtError.message);
      else setError(DEFAULT_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        size="md"
        {...dialog.options}
        open={dialog.open}
        loading={loading}
        error={error || undefined}
        onClose={() => settle(false)}
        onConfirm={handleConfirm}
      />
    </ConfirmContext.Provider>
  );
};

export default ConfirmProvider;
