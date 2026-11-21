import { useState } from "react";
import { FiGlobe } from "react-icons/fi";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { useUpdateSite } from "../../api";
import { TIMEZONE_OPTIONS } from "../../locales";
import "./site_edit_modal.scss";

const HOSTNAME_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

// Dil listesi ve varsayılan dil değişikliği içerik/URL etkisi taşıdığı için burada değil, çoklu dil aşamasında yönetilir (şartname §7).
const SiteEditModal = ({ site, onClose, onSaved }) => {
  const [values, setValues] = useState({ displayName: site.displayName, primaryDomain: site.primaryDomain ?? "", timezone: site.timezone });
  const [errors, setErrors] = useState({});
  const update = useUpdateSite(site.id);

  const setField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const host = values.primaryDomain.trim().toLowerCase();
    const nextErrors = {
      displayName: values.displayName.trim().length >= 2 ? undefined : "Site adını yazın (en az 2 karakter).",
      primaryDomain: !host || HOSTNAME_PATTERN.test(host) ? undefined : "Yalnız alan adını yazın (ör. www.ornek.com).",
    };
    setErrors(nextErrors);
    if (nextErrors.displayName || nextErrors.primaryDomain) return;
    update.mutate({ values: { displayName: values.displayName.trim(), primaryDomain: host || null, timezone: values.timezone }, version: site.version }, {
      onSuccess: onSaved,
      onError: (error) => setErrors(getFieldErrors(error)),
    });
  };

  const formError = update.isError && Object.keys(getFieldErrors(update.error)).length === 0 ? getErrorMessage(update.error) : null;

  return (
    <Modal
      open
      onClose={() => !update.isPending && onClose()}
      title="Site bilgilerini düzenle"
      icon={FiGlobe}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>Vazgeç</Button>
          <Button type="submit" form="site-edit-form" loading={update.isPending}>Kaydet</Button>
        </>
      )}
    >
      <form id="site-edit-form" className="site_edit_modal" onSubmit={submit} noValidate>
        {formError && <Alert variant="danger" size="compact">{formError}</Alert>}
        <Input label="Site adı" name="displayName" value={values.displayName} onChange={(event) => setField("displayName", event.target.value)} error={errors.displayName} maxLength={160} required autoFocus />
        <Input label="Alan adı" name="primaryDomain" optionalText="İsteğe bağlı" placeholder="www.ornek.com" inputMode="url" value={values.primaryDomain} onChange={(event) => setField("primaryDomain", event.target.value)} error={errors.primaryDomain} />
        <Select
          label="Saat dilimi"
          name="timezone"
          required
          options={TIMEZONE_OPTIONS}
          value={TIMEZONE_OPTIONS.find((option) => option.value === values.timezone) ?? null}
          onChange={(option) => setField("timezone", option?.value ?? "")}
          error={errors.timezone}
        />
      </form>
    </Modal>
  );
};

export default SiteEditModal;
