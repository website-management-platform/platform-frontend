// Panel girişi alanlarının istemci denetimi; sunucu aynı kuralları ayrıca uygular (02-tenancy.md "Müşteri hesabı").
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateAccount = (values) => ({
  // Yetkili kişi isteğe bağlıdır; boşsa sunucu müşteri adını kullanır.
  displayName: values.displayName.trim().length === 0 || values.displayName.trim().length >= 2 ? undefined : "Yetkili kişinin adı en az 2 karakter olmalı.",
  email: EMAIL_PATTERN.test(values.email.trim()) ? undefined : "Geçerli bir e-posta adresi girin.",
});
