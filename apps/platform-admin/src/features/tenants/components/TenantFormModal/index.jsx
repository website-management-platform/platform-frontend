import { useRef, useState } from "react";
import { FiBriefcase } from "react-icons/fi";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { createIdempotencyKey } from "@/api/http";
import { focusField } from "@/utils/validation";
import { validateAccount } from "../../account";
import { useCreateTenant, useUpdateTenant } from "../../api";
import "./tenant_form_modal.scss";

const validateFields = (values, creating) => ({
  displayName: values.displayName.trim().length >= 2 ? undefined : "Müşteri adını yazın (en az 2 karakter).",
  maxSites: Number.isInteger(Number(values.maxSites)) && Number(values.maxSites) >= 1 && Number(values.maxSites) <= 100 ? undefined : "1 ile 100 arasında bir sayı girin.",
  ...(creating ? (({ displayName, email }) => ({ accountName: displayName, accountEmail: email }))(validateAccount({ displayName: values.accountName, email: values.accountEmail })) : {}),
});

const FIELDS = ["displayName", "accountEmail", "accountName", "maxSites"];
const SERVER_FIELDS = { displayName: "displayName", maxSites: "quota.maxSites", accountName: "account.displayName", accountEmail: "account.email" };

/** tenant verilmezse yeni müşteri oluşturur; verilirse düzenler. */
const TenantFormModal = ({ open, tenant = null, onClose, onSaved }) => {
  const creating = !tenant;
  const [values, setValues] = useState(() => ({ displayName: tenant?.displayName ?? "", maxSites: String(tenant?.quota.maxSites ?? 100), accountName: "", accountEmail: "" }));
  const [errors, setErrors] = useState({});
  const [idempotencyKey] = useState(createIdempotencyKey);
  const formRef = useRef(null);
  const create = useCreateTenant();
  const update = useUpdateTenant(tenant?.id);
  const mutation = creating ? create : update;

  const setField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = validateFields(values, creating);
    setErrors(nextErrors);
    const invalid = FIELDS.find((field) => nextErrors[field]);
    if (invalid) {
      focusField(formRef.current, invalid);
      return;
    }
    const payload = { displayName: values.displayName.trim(), quota: { maxSites: Number(values.maxSites) } };
    const onError = (error) => {
      const fieldErrors = getFieldErrors(error);
      setErrors(Object.fromEntries(FIELDS.map((field) => [field, fieldErrors[SERVER_FIELDS[field]]])));
    };
    const account = { email: values.accountEmail.trim(), displayName: values.accountName.trim() };
    if (creating) create.mutate({ values: { ...payload, account }, idempotencyKey }, { onSuccess: onSaved, onError });
    else update.mutate({ values: payload, version: tenant.version }, { onSuccess: onSaved, onError });
  };

  const fieldErrors = getFieldErrors(mutation.error);
  const formError = mutation.isError && !Object.values(SERVER_FIELDS).some((field) => fieldErrors[field]) ? getErrorMessage(mutation.error) : null;

  return (
    <Modal
      open={open}
      onClose={() => !mutation.isPending && onClose()}
      title={creating ? "Yeni müşteri" : "Müşteri bilgilerini düzenle"}
      description={creating ? "Müşteri ve panel girişi birlikte oluşturulur. Giriş e-postasına şifre belirleme bağlantısı gider." : undefined}
      icon={FiBriefcase}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Vazgeç</Button>
          <Button type="submit" form="tenant-form" loading={mutation.isPending}>{creating ? "Müşteriyi oluştur" : "Kaydet"}</Button>
        </>
      )}
    >
      <form id="tenant-form" ref={formRef} className="tenant_form_modal" onSubmit={submit} noValidate>
        {formError && <Alert variant="danger" size="compact">{formError}</Alert>}
        <Input label="Müşteri adı" name="displayName" value={values.displayName} onChange={(event) => setField("displayName", event.target.value)} error={errors.displayName} maxLength={160} hint="Kişi veya kuruluşun görünen adı." required autoFocus />
        {creating && (
          <fieldset className="tenant_form_modal_account">
            <legend className="tenant_form_modal_legend">Panel girişi</legend>
            <Input label="Giriş e-postası" name="accountEmail" type="email" autoComplete="off" value={values.accountEmail} onChange={(event) => setField("accountEmail", event.target.value)} error={errors.accountEmail} maxLength={254} hint="Müşteri panele bu adresle girer; bütün sitelerinde tam yetkilidir." required />
            <Input label="Yetkili kişi" name="accountName" autoComplete="off" value={values.accountName} onChange={(event) => setField("accountName", event.target.value)} error={errors.accountName} maxLength={120} hint="Kuruluş adına panele giren kişi. Boş bırakılırsa müşteri adı kullanılır." />
          </fieldset>
        )}
        <Input label="Site sınırı" name="maxSites" type="number" inputMode="numeric" min={1} max={100} value={values.maxSites} onChange={(event) => setField("maxSites", event.target.value)} error={errors.maxSites} hint="Müşterinin açabileceği en fazla site sayısı (1–100)." required />
      </form>
    </Modal>
  );
};

export default TenantFormModal;
