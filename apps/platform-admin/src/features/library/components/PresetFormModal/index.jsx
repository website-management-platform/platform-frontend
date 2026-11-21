import { useState } from "react";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import Textarea from "@/components/Textarea";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { createIdempotencyKey } from "@/api/http";
import { useCreatePreset } from "../../api";
import { suggestLibraryKey } from "../../options";
import PresetModulesEditor from "../PresetModulesEditor";
import "./preset_form_modal.scss";

/** Yeni site preseti: ad, site türü ve başlangıç modülleri (1. sürüm). */
const PresetFormModal = ({ onClose, onSaved }) => {
  const create = useCreatePreset();
  const [idempotencyKey] = useState(createIdempotencyKey);
  const [values, setValues] = useState({ label: "", key: "", family: "", description: "", modules: [] });
  const [keyEdited, setKeyEdited] = useState(false);
  const fieldErrors = getFieldErrors(create.error);
  const generalError = create.error && Object.keys(fieldErrors).length === 0 ? getErrorMessage(create.error) : null;
  const set = (field, value) => setValues((current) => ({ ...current, [field]: value, ...(field === "label" && !keyEdited ? { key: suggestLibraryKey(value) } : {}) }));

  return (
    <Modal
      open
      onClose={onClose}
      title="Yeni site şablonu"
      description="Site şablonu, site oluştururken önerilen bölüm setidir. Siteyi bir türe kilitlemez; her bölüm sonradan değiştirilebilir."
      size="xl"
      busy={create.isPending}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>Vazgeç</Button>
          <Button type="submit" form="preset-form" loading={create.isPending}>Oluştur</Button>
        </>
      )}
    >
      <form
        id="preset-form"
        className="preset_form_modal"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({ idempotencyKey, values: { ...values, label: { tr: values.label.trim() }, family: values.family.trim(), description: values.description.trim() } }, { onSuccess: onSaved });
        }}
      >
        {generalError && <Alert variant="danger" size="compact">{generalError}</Alert>}
        <div className="preset_form_modal_grid">
          <Input label="Ad" required value={values.label} maxLength={120} onChange={(event) => set("label", event.target.value)} error={fieldErrors.label} autoFocus />
          <Input label="Anahtar" required value={values.key} maxLength={63} onChange={(event) => { setKeyEdited(true); set("key", event.target.value.toLowerCase()); }} error={fieldErrors.key} className="preset_form_modal_mono" />
          <Input label="Site türü" required placeholder="ör. Kurumsal, Sivil toplum" value={values.family} maxLength={60} onChange={(event) => set("family", event.target.value)} error={fieldErrors.family} />
        </div>
        <Textarea label="Açıklama" optionalText="İsteğe bağlı" rows={2} maxLength={300} value={values.description} onChange={(event) => set("description", event.target.value)} error={fieldErrors.description} />
        <h3 className="preset_form_modal_title">Bölümler</h3>
        <PresetModulesEditor modules={values.modules} onChange={(modules) => set("modules", modules)} errors={fieldErrors} />
      </form>
    </Modal>
  );
};

export default PresetFormModal;
