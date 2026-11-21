// Müşteri hesabı alanlarının istemci denetimi; sunucu aynı kuralları ayrıca uygular (02-tenancy.md §3).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateAccount = (values) => ({
  displayName: values.displayName.trim().length >= 2 ? undefined : "Ad soyad yazın (en az 2 karakter).",
  email: EMAIL_PATTERN.test(values.email.trim()) ? undefined : "Geçerli bir e-posta adresi girin.",
});
