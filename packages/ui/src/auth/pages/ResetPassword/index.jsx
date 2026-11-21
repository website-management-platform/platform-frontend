import { useRef, useState } from "react";
import { Link as RouterLink } from "react-router";
import { FiAlertTriangle, FiCheckCircle, FiLock } from "react-icons/fi";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import PasswordStrength from "@/components/PasswordStrength";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { useConsumedSearchParam } from "@/hooks/useConsumedSearchParam";
import { usePageTitle } from "@/hooks/usePageTitle";
import { firstErrorField, focusField, getPasswordError } from "@/utils/validation";
import { useResetPassword } from "../../api";
import AuthHeader from "../../components/AuthHeader";
import AuthForm, { AuthFooter } from "../../components/AuthForm";

const FIELD_ORDER = ["password", "passwordConfirm"];

const InvalidLink = () => (
  <>
    <AuthHeader
      icon={FiAlertTriangle}
      tone="warning"
      title="Bağlantı kullanılamıyor"
      description="Bağlantının süresi dolmuş, daha önce kullanılmış ya da eksik olabilir. Şifre bağlantılarının süresi sınırlıdır ve her bağlantı tek kez kullanılır."
    />
    <Button as={RouterLink} to="/sifremi-unuttum" fullWidth>Yeni bağlantı iste</Button>
    <AuthFooter text="Şifrenizi hatırladınız mı?" linkLabel="Giriş yapın" to="/giris" />
  </>
);

const ResetPassword = () => {
  usePageTitle("Yeni şifre belirle");
  const token = useConsumedSearchParam("token");
  const [values, setValues] = useState({ password: "", passwordConfirm: "" });
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const resetPassword = useResetPassword();

  // Süresi dolmuş, kullanılmış veya tanınmayan bağlantı aynı hatayla döner (01-identity.md, POST /reset).
  if (!token) return <InvalidLink />;
  if (getFieldErrors(resetPassword.error).token) return <InvalidLink />;

  if (resetPassword.isSuccess) {
    return (
      <>
        <AuthHeader
          icon={FiCheckCircle}
          tone="success"
          title="Şifreniz güncellendi"
          description="Güvenliğiniz için tüm cihazlardaki oturumlar kapatıldı. Yeni şifrenizle giriş yapabilirsiniz."
        />
        <Button as={RouterLink} to="/giris" fullWidth>Giriş yap</Button>
      </>
    );
  }

  const updateField = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {
      password: getPasswordError(values.password),
      passwordConfirm: values.passwordConfirm === values.password ? undefined : "Şifreler birbiriyle eşleşmiyor.",
    };
    setErrors(nextErrors);
    const invalidField = firstErrorField(nextErrors, FIELD_ORDER);
    if (invalidField) {
      focusField(formRef.current, invalidField);
      return;
    }
    resetPassword.mutate(
      { token, password: values.password },
      { onError: (error) => setErrors((prev) => ({ ...prev, ...getFieldErrors(error) })) },
    );
  };

  const hasFieldErrors = Object.keys(getFieldErrors(resetPassword.error)).length > 0;

  return (
    <>
      <AuthHeader icon={FiLock} title="Yeni şifre belirleyin" description="Daha önce kullanmadığınız, güçlü bir şifre seçin." />
      <div ref={formRef}>
        <AuthForm onSubmit={handleSubmit} ariaLabel="Yeni şifre formu">
          {resetPassword.isError && !hasFieldErrors && (
            <Alert variant="danger" size="compact">{getErrorMessage(resetPassword.error)}</Alert>
          )}
          <Input
            label="Yeni şifre"
            name="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={updateField("password")}
            error={errors.password}
            maxLength={128}
            aria-describedby="reset-password-strength"
            required
          />
          <PasswordStrength password={values.password} id="reset-password-strength" />
          <Input
            label="Yeni şifre (tekrar)"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            value={values.passwordConfirm}
            onChange={updateField("passwordConfirm")}
            error={errors.passwordConfirm}
            required
          />
          <Button type="submit" fullWidth loading={resetPassword.isPending}>Şifreyi güncelle</Button>
        </AuthForm>
      </div>
    </>
  );
};

export default ResetPassword;
