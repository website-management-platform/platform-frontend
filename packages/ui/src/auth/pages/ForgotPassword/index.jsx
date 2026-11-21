import { useRef, useState } from "react";
import { FiKey, FiMail } from "react-icons/fi";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { getErrorMessage } from "@/api/errors";
import { usePageTitle } from "@/hooks/usePageTitle";
import MailboxHint from "@/devtools/components/MailboxHint";
import { focusField, isValidEmail } from "@/utils/validation";
import { useForgotPassword } from "../../api";
import AuthHeader from "../../components/AuthHeader";
import AuthForm, { AuthFooter } from "../../components/AuthForm";

const ForgotPassword = () => {
  usePageTitle("Şifremi unuttum");
  const [email, setEmail] = useState("");
  const [error, setError] = useState();
  const formRef = useRef(null);
  const forgotPassword = useForgotPassword();

  if (forgotPassword.isSuccess) {
    return (
      <>
        <AuthHeader
          icon={FiMail}
          title="Bağlantı yolda"
          description={`${email.trim()} adresiyle kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderdik. Bağlantı 30 dakika geçerlidir.`}
        />
        <div className="auth_form">
          <MailboxHint />
          <Button variant="outline" fullWidth onClick={() => forgotPassword.reset()}>Farklı bir adres dene</Button>
        </div>
        <AuthFooter text="Şifrenizi hatırladınız mı?" linkLabel="Giriş yapın" to="/giris" />
      </>
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Geçerli bir e-posta adresi girin.");
      focusField(formRef.current, "email");
      return;
    }
    forgotPassword.mutate(email.trim());
  };

  return (
    <>
      <AuthHeader
        icon={FiKey}
        title="Şifrenizi mi unuttunuz?"
        description="Hesabınızın e-posta adresini girin, size şifre sıfırlama bağlantısı gönderelim."
      />
      <div ref={formRef}>
        <AuthForm onSubmit={handleSubmit} ariaLabel="Şifre sıfırlama talebi">
          {forgotPassword.isError && <Alert variant="danger" size="compact">{getErrorMessage(forgotPassword.error)}</Alert>}
          <Input
            label="E-posta"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(undefined);
            }}
            error={error}
            required
          />
          <Button type="submit" fullWidth loading={forgotPassword.isPending}>Sıfırlama bağlantısı gönder</Button>
        </AuthForm>
      </div>
      <AuthFooter text="Şifrenizi hatırladınız mı?" linkLabel="Giriş yapın" to="/giris" />
    </>
  );
};

export default ForgotPassword;
