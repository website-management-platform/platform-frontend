import Badge from "@/components/Badge";

const LIFECYCLE_STATUSES = {
  ACTIVE: { label: "Aktif", variant: "success" },
  SUSPENDED: { label: "Askıda", variant: "warning" },
  ARCHIVED: { label: "Arşivde", variant: "neutral" },
  PURGED: { label: "Kalıcı olarak silindi", variant: "danger" },
  ENABLED: { label: "Açık", variant: "success" },
  DISABLED: { label: "Kapalı", variant: "warning" },
};

const StatusBadge = ({ status, size = "sm" }) => {
  const meta = LIFECYCLE_STATUSES[status] ?? { label: status, variant: "neutral" };
  return <Badge size={size} variant={meta.variant} dot>{meta.label}</Badge>;
};

export default StatusBadge;
