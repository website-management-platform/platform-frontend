import { useState } from "react";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { createIdempotencyKey } from "@/api/http";
import "./clone_modal.scss";

/** Şablon, preset veya modül kopyalama: yeni anahtar ve ad ister. onSubmit({ key, label }, idempotencyKey) promise döner. */
const CloneModal = ({ title, description, sourceKey, sourceLabel, keyHint, onClose, onSubmit, pending, error }) => {
  const [key, setKey] = useState(`${sourceKey}-kopya`.slice(0, 63));
  const [label, setLabel] = useState(`${sourceLabel} (kopya)`.slice(0, 120));
  const [idempotencyKey] = useState(createIdempotencyKey);
  const fieldErrors = getFieldErrors(error);
  const generalError = error && Object.keys(fieldErrors).length === 0 ? getErrorMessage(error) : null;

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      busy={pending}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Vazgeç</Button>
          <Button type="submit" form="clone-form" loading={pending}>Kopyala</Button>
        </>
      )}
    >
      <form id="clone-form" className="clone_modal_form" noValidate onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ key: key.trim(), label: { tr: label.trim() } }, idempotencyKey);
      }}>
        {generalError && <Alert variant="danger" size="compact">{generalError}</Alert>}
        <Input label="Ad" required value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} error={fieldErrors.label} autoFocus />
        <Input label="Anahtar" required value={key} maxLength={63} onChange={(event) => setKey(event.target.value.toLowerCase())} error={fieldErrors.key ?? fieldErrors.targetKey} hint={keyHint} className="clone_modal_mono" />
      </form>
    </Modal>
  );
};

export default CloneModal;
