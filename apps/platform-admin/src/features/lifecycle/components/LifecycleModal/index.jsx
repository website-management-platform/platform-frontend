import { useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Textarea from "@/components/Textarea";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { LIFECYCLE_ACTIONS } from "../../actions";
import "./lifecycle_modal.scss";

/**
 * Durum değişikliği onayı: etkisi açıklanır, askı ve arşivde gerekçe zorunludur (şartname §11: etki önizlemesi + açık onay).
 * impacts: { suspend, archive, restore } → kullanıcıya gösterilecek etki metni.
 * actions: işlem tanımları (varsayılan müşteri/site geçişleri; modüller kendi geçişlerini verir).
 */
const LifecycleModal = ({ action, actions = LIFECYCLE_ACTIONS, subject, impacts, onClose, onConfirm, pending, error }) => {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState();
  const meta = action ? actions[action] : null;

  const submit = (event) => {
    event.preventDefault();
    if (meta.reasonRequired && reason.trim().length < 5) {
      setReasonError("En az 5 karakterlik bir gerekçe yazın.");
      return;
    }
    onConfirm(reason.trim());
  };

  const close = () => {
    if (pending) return;
    setReason("");
    setReasonError(undefined);
    onClose();
  };

  const serverReasonError = getFieldErrors(error).reason;
  const formError = error && !serverReasonError ? getErrorMessage(error) : null;

  return (
    <Modal
      open={Boolean(meta)}
      onClose={close}
      title={meta ? `${subject}: ${meta.label.toLocaleLowerCase("tr-TR")}` : ""}
      icon={FiAlertTriangle}
      iconTone={meta?.color === "danger" ? "danger" : "warning"}
      footer={meta && (
        <>
          <Button variant="outline" onClick={close} disabled={pending}>Vazgeç</Button>
          <Button type="submit" form="lifecycle-form" color={meta.color} loading={pending}>{meta.label}</Button>
        </>
      )}
    >
      {meta && (
        <form id="lifecycle-form" className="lifecycle_modal" onSubmit={submit} noValidate>
          {formError && <Alert variant="danger" size="compact">{formError}</Alert>}
          <Alert variant={meta.color === "danger" ? "danger" : "warning"} size="compact" title="Bu işlemin etkisi">{impacts[action]}</Alert>
          <Textarea
            label="Gerekçe"
            name="reason"
            optionalText={meta.reasonRequired ? undefined : "İsteğe bağlı"}
            hint="Denetim kaydına yazılır."
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setReasonError(undefined);
            }}
            error={reasonError ?? serverReasonError}
            required={meta.reasonRequired}
          />
        </form>
      )}
    </Modal>
  );
};

export default LifecycleModal;
