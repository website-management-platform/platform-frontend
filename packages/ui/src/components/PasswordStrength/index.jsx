import Progress from "@/components/Progress";
import { PASSWORD_MIN_LENGTH, PASSWORD_PROBLEM_MESSAGES, getPasswordProblem } from "@/utils/passwordPolicy";
import "./password_strength.scss";

const LEVELS = [
  { label: "Çok kısa", status: "danger" },
  { label: "Zayıf", status: "danger" },
  { label: "Orta", status: "warning" },
  { label: "Güçlü", status: "success" },
];

const scorePassword = (password, problem) => {
  if (!password || problem) return 0;
  const variety = [/[a-zçğıöşü]/, /[A-ZÇĞİÖŞÜ]/, /\d/, /[^\p{L}\d]/u].filter((pattern) => pattern.test(password)).length;
  if (password.length >= 16 && variety >= 3) return 3;
  if (variety >= 3 || (password.length >= 16 && variety >= 2)) return 2;
  return 1;
};

const PasswordStrength = ({ password, email, id }) => {
  const problem = password ? getPasswordProblem(password, { email }) : null;
  const score = scorePassword(password, problem);
  const level = LEVELS[score];

  return (
    <div className="password_strength" id={id}>
      <Progress
        value={password ? Math.max(score, 1) : 0}
        max={3}
        segments={3}
        status={level.status}
        size="sm"
        ariaLabel="Şifre gücü"
      />
      <p className="password_strength_text" aria-live="polite">
        {password && problem && problem !== "TOO_SHORT" && PASSWORD_PROBLEM_MESSAGES[problem]}
        {password && (!problem || problem === "TOO_SHORT") && <>Şifre gücü: <strong>{level.label}</strong></>}
        {!password && `En az ${PASSWORD_MIN_LENGTH} karakter. Büyük-küçük harf, rakam ve sembol karıştırmak şifrenizi güçlendirir.`}
      </p>
    </div>
  );
};

export default PasswordStrength;
