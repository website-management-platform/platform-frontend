import { useState } from "react";
import { labelOf } from "@wmp/schema";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import Textarea from "@/components/Textarea";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { useUpdatePreset } from "../../api";
import "./preset_info_modal.scss";

/** Site şablonunun adı, türü ve açıklaması. Bölüm listesi sürümle değişir ("Yeni sürüm"); bu pencere sürüm üretmez. */
const PresetInfoModal = ({ preset, onClose, onSaved }) => {
  const update = useUpdatePreset(preset.id);
  const [values, setValues] = useState({ label: labelOf(preset.label), family: preset.family ?? "", description: preset.description ?? "" });
  const fieldErrors = getFieldErrors(update.error);
  const generalError = update.error && Object.keys(fieldErrors).length === 0 ? getErrorMessage(update.error) : null;
  const set = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  return (
    <Modal
      open
      onClose={onClose}
      title="Bilgileri düzenle"
      description="Ad ve açıklama site oluşturma ekranında görünür. Bu şablonla kurulmuş siteler etkilenmez."
      busy={update.isPending}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>Vazgeç</Button>
          <Button type="submit" form="preset-info-form" loading={update.isPending}>Kaydet</Button>
        </>
      )}
    >
      <form
        id="preset-info-form"
        className="preset_info_modal"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          update.mutate(
            { values: { label: { ...preset.label, tr: values.label.trim() }, family: values.family.trim(), description: values.description.trim() }, version: preset.version },
            { onSuccess: onSaved },
          );
        }}
      >
        {generalError && <Alert variant="danger" size="compact">{generalError}</Alert>}
        <Input label="Ad" name="label" required value={values.label} maxLength={120} onChange={(event) => set("label", event.target.value)} error={fieldErrors.label ?? fieldErrors["label.tr"]} autoFocus />
        <Input label="Site türü" name="family" required placeholder="ör. Kurumsal, Sivil toplum" value={values.family} maxLength={60} onChange={(event) => set("family", event.target.value)} error={fieldErrors.family} />
        <Textarea label="Açıklama" name="description" optionalText="İsteğe bağlı" rows={3} maxLength={300} value={values.description} onChange={(event) => set("description", event.target.value)} error={fieldErrors.description} />
      </form>
    </Modal>
  );
};

export default PresetInfoModal;
