import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { FiKey, FiMonitor, FiSmartphone } from "react-icons/fi";
import Alert from "@/components/Alert";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import PageHeader from "@/components/PageHeader";
import PasswordStrength from "@/components/PasswordStrength";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { useConfirm } from "@/hooks/useConfirm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatDateTime, formatRelativeTime } from "@/utils/format";
import { firstErrorField, focusField, getPasswordError } from "@/utils/validation";
import { useChangePassword, useCurrentUser, useRevokeSession, useSessions } from "@/auth/api";
import "./account_security.scss";

const BROWSERS = [["Edg/", "Edge"], ["OPR/", "Opera"], ["Firefox/", "Firefox"], ["Chrome/", "Chrome"], ["Safari/", "Safari"]];
const SYSTEMS = [["iPhone", "iOS"], ["iPad", "iPadOS"], ["Android", "Android"], ["Mac OS X", "macOS"], ["Windows", "Windows"], ["Linux", "Linux"]];

const describeDevice = (userAgent = "") => {
  const browser = BROWSERS.find(([token]) => userAgent.includes(token))?.[1];
  const system = SYSTEMS.find(([token]) => userAgent.includes(token))?.[1];
  if (!browser && !system) return { label: "Bilinmeyen cihaz", mobile: false };
  return { label: [browser, system].filter(Boolean).join(" · "), mobile: ["iOS", "iPadOS", "Android"].includes(system) };
};

const PASSWORD_FIELDS = ["currentPassword", "newPassword", "newPasswordConfirm"];
const EMPTY_PASSWORDS = { currentPassword: "", newPassword: "", newPasswordConfirm: "" };

const PasswordSection = () => {
  const user = useCurrentUser();
  const [values, setValues] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const change = useChangePassword();

  const updateField = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {
      currentPassword: values.currentPassword ? undefined : "Mevcut şifrenizi girin.",
      newPassword: getPasswordError(values.newPassword, { email: user.email }) ?? (values.newPassword === values.currentPassword ? "Yeni şifre mevcut şifreden farklı olmalı." : undefined),
      newPasswordConfirm: values.newPasswordConfirm === values.newPassword ? undefined : "Şifreler birbiriyle eşleşmiyor.",
    };
    setErrors(nextErrors);
    const invalidField = firstErrorField(nextErrors, PASSWORD_FIELDS);
    if (invalidField) {
      focusField(formRef.current, invalidField);
      return;
    }
    change.mutate({ currentPassword: values.currentPassword, newPassword: values.newPassword }, {
      onSuccess: () => {
        setValues(EMPTY_PASSWORDS);
        toast.success("Şifreniz değiştirildi; diğer cihazlardaki oturumlar kapatıldı");
      },
      onError: (error) => {
        const fieldErrors = getFieldErrors(error);
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        const field = firstErrorField(fieldErrors, PASSWORD_FIELDS);
        if (field) focusField(formRef.current, field);
      },
    });
  };

  const hasFieldErrors = Object.keys(getFieldErrors(change.error)).length > 0;

  return (
    <Card title="Şifre değiştir" description="Değiştirdiğinizde bu cihaz açık kalır, diğer cihazlardaki oturumlar kapanır." icon={FiKey}>
      <form ref={formRef} className="account_security_password" onSubmit={handleSubmit} noValidate aria-label="Şifre değiştirme formu">
        {change.isError && !hasFieldErrors && <Alert variant="danger" size="compact">{getErrorMessage(change.error)}</Alert>}
        {/* Şifre yöneticileri hangi hesabın şifresinin değiştiğini kullanıcı adından anlar; alan görünmez ve odak almaz. */}
        <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />
        <Input label="Mevcut şifre" name="currentPassword" type="password" autoComplete="current-password" value={values.currentPassword} onChange={updateField("currentPassword")} error={errors.currentPassword} required />
        <Input label="Yeni şifre" name="newPassword" type="password" autoComplete="new-password" value={values.newPassword} onChange={updateField("newPassword")} error={errors.newPassword} maxLength={128} aria-describedby="account-password-strength" required />
        <PasswordStrength password={values.newPassword} id="account-password-strength" />
        <Input label="Yeni şifre (tekrar)" name="newPasswordConfirm" type="password" autoComplete="new-password" value={values.newPasswordConfirm} onChange={updateField("newPasswordConfirm")} error={errors.newPasswordConfirm} required />
        <div>
          <Button type="submit" loading={change.isPending}>Şifreyi değiştir</Button>
        </div>
      </form>
    </Card>
  );
};

const SessionsSection = () => {
  const sessionsQuery = useSessions();
  const revoke = useRevokeSession();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const handleRevoke = async (session) => {
    const confirmed = await confirm({
      variant: "destructive",
      title: session.current ? "Bu cihazdaki oturum kapatılsın mı?" : "Oturum sonlandırılsın mı?",
      description: session.current
        ? "Bu cihazda çıkış yapılır ve giriş sayfasına dönülür."
        : "O cihazda bir sonraki işlemde yeniden giriş istenir.",
      confirmLabel: "Sonlandır",
      onConfirm: () => revoke.mutateAsync(session.id),
    });
    if (!confirmed) return;
    if (session.current) navigate("/giris", { replace: true });
    else toast.success("Oturum sonlandırıldı");
  };

  return (
    <Card title="Açık oturumlar" description="Hesabınıza giriş yapılmış cihazlar. Tanımadığınız bir oturumu hemen sonlandırın." icon={FiMonitor}>
      {sessionsQuery.isError && <QueryErrorAlert error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} />}
      {sessionsQuery.isPending && <Skeleton variant="text" lines={3} />}
      {sessionsQuery.isSuccess && (
        <ul className="account_security_sessions">
          {sessionsQuery.data.items.map((session) => {
            const device = describeDevice(session.userAgent);
            const DeviceIcon = device.mobile ? FiSmartphone : FiMonitor;
            return (
              <li key={session.id} className="account_security_session">
                <DeviceIcon className="account_security_session_icon" aria-hidden="true" />
                <div className="account_security_session_text">
                  <span className="account_security_session_title">
                    {device.label}
                    {session.current && <Badge size="sm" variant="info">Bu cihaz</Badge>}
                  </span>
                  <span className="account_security_session_meta">
                    Son etkinlik {formatRelativeTime(session.lastSeenAt)} · Giriş {formatDateTime(session.createdAt)}
                  </span>
                </div>
                <Button variant="outline" size="sm" color="danger" onClick={() => handleRevoke(session)}>Sonlandır</Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

const AccountSecurity = () => {
  usePageTitle("Hesap güvenliği");
  const user = useCurrentUser();

  return (
    <div className="account_security">
      <PageHeader title="Hesap güvenliği" description={`${user.displayName} · ${user.email}`} />
      <PasswordSection />
      <SessionsSection />
    </div>
  );
};

export default AccountSecurity;
