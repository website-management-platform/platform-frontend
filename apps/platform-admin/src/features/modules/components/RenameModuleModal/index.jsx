import { useState } from "react";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import { getErrorMessage, getFieldErrors } from "@/api/errors";

/** Modülün müşteriye görünen adı (dillere göre). Anahtar değişmez. */
const RenameModuleModal = ({ instance, locales, mutation, getVersion, onClose, onSaved }) => {
  const [label, setLabel] = useState(instance.label);
  const fieldErrors = getFieldErrors(mutation.error);
  return (
    <Modal
      open
      onClose={onClose}
      title="Bölüm adını değiştir"
      description="Ad müşteri panelinin menüsünde görünür. Bölüm anahtarı ve web sitesi entegrasyonu değişmez."
      busy={mutation.isPending}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Vazgeç</Button>
          <Button type="submit" form="rename-module-form" loading={mutation.isPending}>Kaydet</Button>
        </>
      )}
    >
      <form
        id="rename-module-form"
        className="clone_modal_form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const cleaned = Object.fromEntries(Object.entries(label).map(([locale, text]) => [locale, text.trim()]).filter(([, text]) => text));
          mutation.mutate({ values: { label: cleaned }, version: getVersion() }, { onSuccess: onSaved });
        }}
      >
        {mutation.isError && !fieldErrors.label && <Alert variant="danger" size="compact">{getErrorMessage(mutation.error)}</Alert>}
        {locales.map((locale, index) => (
          <Input
            key={locale}
            label={index === 0 ? `Ad (${locale})` : `Ad (${locale})`}
            required={locale === "tr"}
            optionalText={locale === "tr" ? undefined : "İsteğe bağlı"}
            maxLength={120}
            value={label[locale] ?? ""}
            onChange={(event) => setLabel((current) => ({ ...current, [locale]: event.target.value }))}
            error={locale === "tr" ? fieldErrors.label : undefined}
            autoFocus={index === 0}
          />
        ))}
      </form>
    </Modal>
  );
};

export default RenameModuleModal;
