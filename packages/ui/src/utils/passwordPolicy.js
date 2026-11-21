export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

// Backend ile aynı liste: core/src/main/resources/security/common-passwords.txt (ADR-0003).
const COMMON_PASSWORDS = new Set([
  "123456789012345",
  "1234567890123456",
  "123456789abcdef",
  "parola123456789",
  "password1234567",
  "passwordpassword",
  "qwertyuiopasdfg",
  "qwertyuiop123456",
  "sifre1234567890",
  "şifre1234567890",
  "abc123456789012",
  "aaaaaaaaaaaaaaa",
  "111111111111111",
  "000000000000000",
  "iloveyou1234567",
  "welcome12345678",
  "galatasaray1905",
  "fenerbahce19071907",
  "besiktas19031903",
  "istanbul1234567",
  "türkiye12345678",
  "turkiye12345678",
  "administrator123",
  "adminadminadmin",
  "letmeinletmein1",
]);

export const PASSWORD_POLICY_TEXT = `Şifre ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} karakter olmalı; yaygın bir şifre veya e-posta adresinizin bir parçası olmamalı.`;

const emailLocalPart = (email) => (typeof email === "string" ? email.trim().toLowerCase().split("@")[0] : "");

export const getPasswordProblem = (password, { email } = {}) => {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) return "TOO_SHORT";
  if (password.length > PASSWORD_MAX_LENGTH) return "TOO_LONG";
  const normalized = password.toLocaleLowerCase("tr-TR");
  if (COMMON_PASSWORDS.has(normalized) || new Set(normalized).size <= 2) return "COMMON";
  const localPart = emailLocalPart(email);
  const containsEmail = [normalized, password.toLowerCase()].some((variant) => variant.includes(localPart));
  if (localPart.length >= 4 && containsEmail) return "CONTAINS_EMAIL";
  return null;
};

export const PASSWORD_PROBLEM_MESSAGES = {
  TOO_SHORT: `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı.`,
  TOO_LONG: `Şifre en fazla ${PASSWORD_MAX_LENGTH} karakter olabilir.`,
  COMMON: "Bu şifre çok yaygın; tahmin edilmesi zor bir şifre seçin.",
  CONTAINS_EMAIL: "Şifre e-posta adresinizin bir parçasını içermemeli.",
};
