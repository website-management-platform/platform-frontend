import {
  FiUser,
  FiSettings,
  FiEdit2,
  FiInbox,
  FiCheckCircle,
  FiFilter,
  FiHome,
  FiGrid,
  FiBell,
  FiFolder,
  FiUserPlus,
} from "react-icons/fi";
import Badge from "@/components/Badge";

export const ALERT_DIALOG_CONFIG = {
  destructive: {
    title: "Hesabı sil",
    description: "Bu işlem geri alınamaz. Hesabınız ve tüm verileriniz kalıcı olarak silinir.",
    confirmLabel: "Hesabı Sil",
    requireConfirmText: "SİL",
  },
  warning: {
    title: "Oturumu kapat",
    description: "Kaydedilmemiş değişiklikleriniz kaybolacak.",
    confirmLabel: "Oturumu Kapat",
  },
  success: {
    title: "Planı onayla",
    description: "Pro plana yükseltme işlemini onaylıyor musunuz?",
    confirmLabel: "Onayla",
  },
  info: {
    title: "Yeni sürüm hazır",
    description: "Uygulamanın yeni sürümüne geçmek için sayfa yeniden yüklenecek.",
    confirmLabel: "Şimdi güncelle",
    cancelLabel: "Sonra",
  },
  default: {
    title: "Devam etmek istiyor musunuz?",
    description: "Bu işlem birkaç saniye sürebilir.",
    confirmLabel: "Devam Et",
  },
};

export const TOAST_APPEARANCES = [
  { value: "default", label: "Varsayılan" },
  { value: "soft", label: "Soft" },
  { value: "solid", label: "Solid" },
  { value: "accent", label: "Şerit" },
];

export const TOAST_ICON_STYLES = [
  { value: "plain", label: "Sade ikon" },
  { value: "circle", label: "Daire ikon" },
];

export const TOAST_SIZES = [
  { value: "md", label: "Normal" },
  { value: "sm", label: "Kompakt" },
];

export const TOAST_POSITIONS = [
  { value: "top-right", label: "Sağ üst" },
  { value: "top-center", label: "Orta üst" },
  { value: "bottom-right", label: "Sağ alt" },
  { value: "bottom-center", label: "Orta alt" },
];

export const ALERT_DIALOG_LAYOUTS = [
  { value: "centered", label: "Ortalı" },
  { value: "side", label: "Yan ikon" },
  { value: "banner", label: "Üst bant" },
];

export const ALERT_DIALOG_ICON_APPEARANCES = [
  { value: "soft", label: "Soft" },
  { value: "solid", label: "Solid" },
  { value: "outline", label: "Outline" },
];

export const ALERT_DIALOG_ACTION_LAYOUTS = [
  { value: "inline", label: "Yan yana" },
  { value: "stacked", label: "Alt alta" },
];

export const NOTIFICATION_OPTIONS = [
  { value: "instant", label: "Anında" },
  { value: "daily", label: "Günlük özet", description: "Her sabah 09:00'da tek e-posta." },
  { value: "weekly", label: "Haftalık özet" },
];

export const CHANNEL_OPTIONS = [
  { value: "email", label: "E-posta" },
  { value: "sms", label: "SMS" },
  { value: "push", label: "Mobil bildirim", disabled: true },
];

export const PLAN_OPTIONS = [
  { value: "starter", label: "Başlangıç", description: "5 kullanıcıya kadar, temel raporlar.", icon: FiUser, meta: "₺0/ay" },
  {
    value: "pro",
    label: "Pro",
    description: "Sınırsız kullanıcı, gelişmiş raporlar ve entegrasyonlar.",
    icon: FiCheckCircle,
    meta: "₺499/ay",
    badge: <Badge variant="accent" size="sm">Popüler</Badge>,
  },
  { value: "enterprise", label: "Kurumsal", description: "SSO, denetim kayıtları ve öncelikli destek.", icon: FiSettings, meta: "Teklif" },
];

export const MODULE_OPTIONS = [
  { value: "reports", label: "Raporlar", description: "Satış ve kullanım panoları.", icon: FiGrid },
  { value: "notifications", label: "Bildirimler", description: "E-posta ve uygulama içi bildirimler.", icon: FiBell },
  { value: "inbox", label: "Gelen kutusu", description: "Müşteri mesajlarını tek yerde toplar.", icon: FiInbox },
  { value: "filters", label: "Gelişmiş filtreler", description: "Kaydedilmiş görünümler ve segmentler.", icon: FiFilter },
];

export const SIZES = ["sm", "md", "lg"];
export const BUTTON_COLORS = ["primary", "accent", "neutral", "success", "warning", "danger"];
export const BUTTON_APPEARANCES = ["solid", "soft", "outline", "ghost", "link"];
export const SWITCH_COLORS = ["accent", "success", "warning", "danger", "neutral"];
export const TEAM_MEMBERS = ["Ayşe Kaya", "Mehmet Demir", "Zeynep Arslan", "Can Yıldız", "Elif Şahin", "Burak Öz"];

export const RICH_SELECT_OPTIONS = [
  { value: "admin", label: "Yönetici", description: "Tüm modüllere tam erişim", icon: FiSettings },
  { value: "editor", label: "Editör", description: "İçerik oluşturur ve düzenler", icon: FiEdit2 },
  { value: "viewer", label: "İzleyici", description: "Yalnızca görüntüleme yetkisi", icon: FiUser },
];

export const GROUPED_SELECT_OPTIONS = [
  { label: "Marmara", options: [{ value: "istanbul", label: "İstanbul" }, { value: "bursa", label: "Bursa" }] },
  { label: "Ege", options: [{ value: "izmir", label: "İzmir" }, { value: "aydin", label: "Aydın" }] },
];

export const RICH_TAB_ITEMS = [
  { id: "overview", label: "Genel", icon: FiHome },
  { id: "inbox", label: "Gelen kutusu", icon: FiInbox, badge: 12 },
  { id: "alerts", label: "Uyarılar", icon: FiBell, dot: "danger" },
  { id: "archive", label: "Arşiv", icon: FiFolder, disabled: true },
];

export const FORM_MODAL_TABS = [
  { id: "general", label: "Genel" },
  { id: "team", label: "Ekip" },
  { id: "settings", label: "Ayarlar" },
];

export const STEPPER_STEPS = [
  { id: "account", label: "Hesap", description: "Temel bilgiler" },
  { id: "company", label: "Şirket", description: "Fatura bilgileri" },
  { id: "team", label: "Ekip", description: "Kullanıcı davetleri" },
  { id: "done", label: "Tamamlandı" },
];

export const ACTIVITY_ITEMS = [
  { id: "a1", title: "Ayşe Kaya projeyi güncelledi", description: "Teslim tarihi 20 Ekim olarak değiştirildi.", time: "10 dk önce", tone: "accent", icon: FiEdit2 },
  { id: "a2", title: "Mehmet Demir ekibe katıldı", time: "2 sa önce", tone: "success", icon: FiUserPlus },
  { id: "a3", title: "Fatura gecikti", description: "Eylül faturası için hatırlatma gönderildi.", time: "Dün", tone: "warning" },
  { id: "a4", title: "Proje oluşturuldu", time: "3 gün önce" },
];

export const BREADCRUMB_DEMO_ITEMS = [
  { label: "Ana Sayfa", path: "/" },
  { label: "Raporlar", path: "/raporlar" },
  { label: "Aylık satış" },
];
export const BADGE_VARIANTS = ["neutral", "accent", "success", "warning", "danger", "info"];
export const TOOLTIP_PLACEMENTS = ["top", "bottom", "left", "right"];
export const DROPDOWN_PLACEMENTS = ["bottom_start", "bottom_end"];

export const SELECT_OPTIONS = [
  { value: "customer", label: "Müşteri" },
  { value: "project", label: "Proje" },
  { value: "invoice", label: "Fatura" },
  { value: "user", label: "Kullanıcı" },
  { value: "report", label: "Rapor" },
];

export const TAB_ITEMS = [
  { id: "overview", label: "Genel Bakış" },
  { id: "activity", label: "Aktivite", badge: 4 },
  { id: "settings", label: "Ayarlar" },
];
