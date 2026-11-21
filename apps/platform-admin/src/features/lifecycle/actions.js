// Askı, arşiv ve yeniden etkinleştirme; hangi durumdan hangisine geçilebildiği sözleşmeyle aynıdır (02-tenancy.md "Durum geçişleri").
export const LIFECYCLE_ACTIONS = {
  suspend: { label: "Askıya al", from: ["ACTIVE"], reasonRequired: true, color: "warning", verb: "askıya alındı" },
  archive: { label: "Arşivle", from: ["ACTIVE", "SUSPENDED"], reasonRequired: true, color: "danger", verb: "arşivlendi" },
  restore: { label: "Yeniden etkinleştir", from: ["SUSPENDED", "ARCHIVED"], reasonRequired: false, color: "primary", verb: "yeniden etkinleştirildi" },
};

export const availableActions = (status) => Object.entries(LIFECYCLE_ACTIONS)
  .filter(([, action]) => action.from.includes(status))
  .map(([key, action]) => ({ key, ...action }));
