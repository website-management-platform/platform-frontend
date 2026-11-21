import { useRef, useState } from "react";
import { FiUser } from "react-icons/fi";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { focusField } from "@/utils/validation";
import { useUpdateAccount } from "../../api";
import { validateAccount } from "../../account";
import "./account_form_modal.scss";

/** Müşteri hesabının e-postasını ve adını düzenler; e-posta değişirse yeni adrese şifre belirleme bağlantısı gider. */
const AccountFormModal = ({ tenant, onClose, onSaved }) => {
  const account = tenant.account;
  const [values, setValues] = useState({ email: account?.email ?? "", displayName: account?.displayName ?? "" });
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const update = useUpdateAccount(tenant.id);
  const emailChanged = Boolean(account) && values.email.trim().toLowerCase() !== account.email;

  const setField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = validateAccount(values);
    setErrors(nextErrors);
    const invalid = ["email", "displayName"].find((field) => nextErrors[field]);
    if (invalid) {
      focusField(formRef.current, invalid);
      return;
    }
    update.mutate({ email: values.email.trim(), displayName: values.displayName.trim() }, {
      onSuccess: () => onSaved({ emailChanged: emailChanged || !account }),
      onError: (error) => {
        const fieldErrors = getFieldErrors(error);
        setErrors({ email: fieldErrors["account.email"], displayName: fieldErrors["account.displayName"] });
      },
    });
  };

  const fieldErrors = getFieldErrors(update.error);
  const formError = update.isError && !fieldErrors["account.email"] && !fieldErrors["account.displayName"] ? getErrorMessage(update.error) : null;

  return (
    <Modal
      open
      onClose={() => !update.isPending && onClose()}
      title={account ? "Hesabı düzenle" : "Hesap oluştur"}
      description={`${tenant.displayName} müşterisinin panele giriş yapan hesabı.`}
      icon={FiUser}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>Vazgeç</Button>
          <Button type="submit" form="account-form" loading={update.isPending}>Kaydet</Button>
        </>
      )}
    >
      <form id="account-form" ref={formRef} className="account_form_modal" onSubmit={submit} noValidate>
        {formError && <Alert variant="danger" size="compact">{formError}</Alert>}
        <Input label="Ad soyad" name="displayName" autoComplete="off" value={values.displayName} onChange={(event) => setField("displayName", event.target.value)} error={errors.displayName} maxLength={120} required autoFocus />
        <Input label="E-posta" name="email" type="email" autoComplete="off" value={values.email} onChange={(event) => setField("email", event.target.value)} error={errors.email} maxLength={254} required />
        {emailChanged && (
          <Alert variant="warning" size="compact">
            E-posta değişince hesabın açık oturumları kapanır ve yeni adrese şifre belirleme bağlantısı gönderilir.
          </Alert>
        )}
      </form>
    </Modal>
  );
};

export default AccountFormModal;
