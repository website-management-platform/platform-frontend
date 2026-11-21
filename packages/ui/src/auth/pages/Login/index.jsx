import { useRef, useState } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { getErrorMessage } from "@/api/errors";
import { usePageTitle } from "@/hooks/usePageTitle";
import { safeReturnTo } from "@/utils/returnTo";
import { firstErrorField, focusField, isValidEmail } from "@/utils/validation";
import { useLogin } from "../../api";
import AuthHeader from "../../components/AuthHeader";
import AuthForm from "../../components/AuthForm";
import DemoAccounts from "../../components/DemoAccounts";

const FIELD_ORDER = ["email", "password"];

const Login = () => {
  usePageTitle("Giriş yap");
  const [searchParams] = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const [values, setValues] = useState(() => ({ email: searchParams.get("email") ?? "", password: "" }));
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const login = useLogin();
  const navigate = useNavigate();

  const updateField = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {
      email: isValidEmail(values.email) ? undefined : "Geçerli bir e-posta adresi girin.",
      password: values.password ? undefined : "Şifrenizi girin.",
    };
    setErrors(nextErrors);
    const invalidField = firstErrorField(nextErrors, FIELD_ORDER);
    if (invalidField) {
      focusField(formRef.current, invalidField);
      return;
    }
    const email = values.email.trim();
    login.mutate({ email, password: values.password }, {
      // Giriş yalnız e-posta ve şifreyle yapılır (ADR-055).
      onSuccess: () => navigate(returnTo, { replace: true }),
    });
  };

  return (
    <>
      <AuthHeader title="Giriş yapın" description="Devam etmek için hesabınıza giriş yapın." />
      <div ref={formRef}>
        <AuthForm onSubmit={handleSubmit} ariaLabel="Giriş formu">
          {login.isError && <Alert variant="danger" size="compact">{getErrorMessage(login.error)}</Alert>}
          <Input
            label="E-posta"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={values.email}
            onChange={updateField("email")}
            error={errors.email}
            required
          />
          <Input
            label="Şifre"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={updateField("password")}
            error={errors.password}
            required
            labelAction={<RouterLink to="/sifremi-unuttum">Şifremi unuttum</RouterLink>}
          />
          <Button type="submit" fullWidth loading={login.isPending}>Giriş yap</Button>
        </AuthForm>
      </div>
      <DemoAccounts onSelect={(account) => {
        setValues(account);
        setErrors({});
      }}
      />
    </>
  );
};

export default Login;
