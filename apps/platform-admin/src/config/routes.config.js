import { useCallback } from "react";
import { FiActivity, FiBriefcase, FiFileText, FiGlobe, FiGrid, FiHome, FiLayers, FiPackage, FiShield, FiSliders } from "react-icons/fi";
import { usePlatformCan } from "@/auth/api";

// Panel rotaları. permission: platform izni (00-conventions.md §6; arayüz denetimi yalnız deneyimdir, API her istekte denetler).
// Menü, breadcrumb, komut paleti ve router bu listeden @/app/routing ile üretilir.
export const routeGroups = [
  {
    id: "main",
    title: "Yönetim",
    items: [
      { id: "overview", label: "Genel bakış", path: "/", icon: FiHome, permission: "platform.tenant.read", load: () => import("@/features/overview/pages/Overview") },
      {
        id: "tenants",
        label: "Müşteriler",
        path: "/musteriler",
        icon: FiBriefcase,
        permission: "platform.tenant.read",
        load: () => import("@/features/tenants/pages/TenantList"),
        indexPage: true,
        children: [
          { id: "tenant-detail", label: "Müşteri", path: "/musteriler/:tenantId", hideInMenu: true, permission: "platform.tenant.read", load: () => import("@/features/tenants/pages/TenantDetail") },
        ],
      },
      {
        id: "sites",
        label: "Web siteleri",
        path: "/siteler",
        icon: FiGlobe,
        permission: "platform.site.read",
        load: () => import("@/features/sites/pages/SiteList"),
        indexPage: true,
        children: [
          { id: "site-create", label: "Site oluştur", path: "/siteler/yeni", hideInMenu: true, permission: "platform.site.manage", load: () => import("@/features/sites/pages/SiteCreate") },
          { id: "site-detail", label: "Site", path: "/siteler/:siteId", hideInMenu: true, permission: "platform.site.read", load: () => import("@/features/sites/pages/SiteDetail") },
          { id: "site-module", label: "Bölüm", path: "/siteler/:siteId/moduller/:instanceId", hideInMenu: true, permission: "platform.site.read", load: () => import("@/features/modules/pages/ModuleDetail") },
        ],
      },
    ],
  },
  {
    id: "library",
    title: "Kütüphane",
    items: [
      {
        id: "templates",
        label: "Bölüm şablonları",
        path: "/moduller",
        icon: FiLayers,
        permission: "platform.library.read",
        load: () => import("@/features/library/pages/TemplateList"),
        indexPage: true,
        children: [
          { id: "template-detail", label: "Şablon", path: "/moduller/:templateId", hideInMenu: true, permission: "platform.library.read", load: () => import("@/features/library/pages/TemplateDetail") },
        ],
      },
      {
        id: "presets",
        label: "Site şablonları",
        path: "/presetler",
        icon: FiPackage,
        permission: "platform.library.read",
        load: () => import("@/features/library/pages/PresetList"),
        indexPage: true,
        children: [
          { id: "preset-detail", label: "Site şablonu", path: "/presetler/:presetId", hideInMenu: true, permission: "platform.library.read", load: () => import("@/features/library/pages/PresetDetail") },
        ],
      },
      {
        id: "fields",
        label: "Alan grupları",
        path: "/alanlar",
        icon: FiSliders,
        permission: "platform.library.read",
        load: () => import("@/features/library/pages/FieldLibrary"),
        indexPage: true,
        children: [
          { id: "field-group-create", label: "Yeni alan grubu", path: "/alanlar/gruplar/yeni", hideInMenu: true, permission: "platform.library.manage", load: () => import("@/features/library/pages/FieldGroupEditor") },
          { id: "field-group-detail", label: "Alan grubu", path: "/alanlar/gruplar/:groupId", hideInMenu: true, permission: "platform.library.read", load: () => import("@/features/library/pages/FieldGroupEditor") },
        ],
      },
    ],
  },
  {
    id: "operations",
    title: "Operasyon",
    items: [
      { id: "jobs", label: "İşler ve sağlık", path: "/operasyon", icon: FiActivity, permission: "platform.site.read", load: () => import("@/features/operations/pages/Operations") },
      { id: "audit", label: "Denetim kaydı", path: "/denetim", icon: FiFileText, permission: "platform.audit.read", load: () => import("@/features/audit/pages/AuditLog") },
    ],
  },
  {
    id: "account",
    title: "Hesap",
    hidden: true,
    items: [
      { id: "account-security", label: "Hesap güvenliği", path: "/hesap/guvenlik", icon: FiShield, load: () => import("@/account/pages/AccountSecurity") },
    ],
  },
];

if (import.meta.env.DEV) {
  routeGroups.push({
    id: "development",
    title: "Geliştirme",
    hidden: true,
    items: [
      { id: "components", label: "Bileşen Kütüphanesi", path: "/bilesenler", icon: FiGrid, load: () => import("@/pages/ComponentLibrary") },
    ],
  });
}

export const useRouteAccess = () => {
  const can = usePlatformCan();
  return useCallback((item) => !item.permission || can(item.permission), [can]);
};
