import { useState } from "react";
import { FiFolder, FiGrid, FiList } from "react-icons/fi";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import ChoiceCard from "@/components/ChoiceCard";
import FieldGroup from "@/components/FieldGroup";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { createIdempotencyKey } from "@/api/http";
import { KIND_OPTIONS } from "../../../schema-designer/labels";
import { useCreateTemplate } from "../../api";
import { ICON_OPTIONS, suggestLibraryKey } from "../../options";
import "./template_form_modal.scss";

const KIND_ICONS = { collection: FiList, singleton: FiGrid, tree: FiFolder };

/** Yeni şablon: ad, anahtar, kategori, içerik türü. Alanlar oluşturulduktan sonra tasarımcıda eklenir. */
const TemplateFormModal = ({ categories, onClose, onSaved }) => {
  const create = useCreateTemplate();
  const [idempotencyKey] = useState(createIdempotencyKey);
  const [values, setValues] = useState({ label: "", key: "", category: categories[0] ?? "", kind: "collection", icon: "box", description: "" });
  const [keyEdited, setKeyEdited] = useState(false);
  const fieldErrors = getFieldErrors(create.error);
  const generalError = create.error && Object.keys(fieldErrors).length === 0 ? getErrorMessage(create.error) : null;
  const set = (field, value) => setValues((current) => ({ ...current, [field]: value, ...(field === "label" && !keyEdited ? { key: suggestLibraryKey(value) } : {}) }));
  const categoryOptions = categories.map((item) => ({ value: item, label: item }));

  const submit = (event) => {
    event.preventDefault();
    create.mutate({ idempotencyKey, values: { ...values, label: { tr: values.label.trim() }, description: values.description.trim() } }, { onSuccess: onSaved });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Yeni bölüm şablonu"
      description="Şablon, sitelere eklenebilen yeniden kullanılabilir içerik yapısıdır. Alanları bir sonraki adımda tasarımcıda eklersiniz."
      size="lg"
      busy={create.isPending}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>Vazgeç</Button>
          <Button type="submit" form="template-form" loading={create.isPending}>Oluştur ve tasarla</Button>
        </>
      )}
    >
      <form id="template-form" className="template_form_modal" noValidate onSubmit={submit}>
        {generalError && <Alert variant="danger" size="compact">{generalError}</Alert>}
        <div className="template_form_modal_grid">
          <Input label="Ad" required value={values.label} maxLength={120} onChange={(event) => set("label", event.target.value)} error={fieldErrors.label} autoFocus />
          <Input label="Anahtar" required value={values.key} maxLength={63} onChange={(event) => { setKeyEdited(true); set("key", event.target.value.toLowerCase()); }} error={fieldErrors.key} hint="Platform genelinde benzersiz; değiştirilemez." className="template_form_modal_mono" />
          <Select label="Kategori" required options={categoryOptions} value={categoryOptions.find((item) => item.value === values.category) ?? null} onChange={(option) => set("category", option?.value ?? "")} error={fieldErrors.category} />
          <Select label="İkon" options={ICON_OPTIONS} value={ICON_OPTIONS.find((item) => item.value === values.icon) ?? null} onChange={(option) => set("icon", option?.value ?? "box")} error={fieldErrors.icon} />
        </div>
        <Textarea label="Açıklama" optionalText="İsteğe bağlı" rows={2} maxLength={300} value={values.description} onChange={(event) => set("description", event.target.value)} error={fieldErrors.description} />
        <FieldGroup legend="İçerik türü" layout="grid" columns={3} error={fieldErrors.kind}>
          {KIND_OPTIONS.map((option) => (
            <ChoiceCard key={option.value} name="template-kind" value={option.value} icon={KIND_ICONS[option.value]} label={option.label} description={option.description} checked={values.kind === option.value} onChange={() => set("kind", option.value)} />
          ))}
        </FieldGroup>
      </form>
    </Modal>
  );
};

export default TemplateFormModal;
