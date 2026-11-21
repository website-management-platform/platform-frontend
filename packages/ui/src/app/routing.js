import { useMemo } from "react";
import { matchPath, useLocation } from "react-router";
import * as routesConfig from "@/config/routes.config";

// Uygulamanın routes.config dosyası yalnız rotaları bildirir; menü, breadcrumb, komut paleti ve router bu modeli kullanır.
// İsteğe bağlı dışa aktarımlar:
// - useRouteAccess() → (item) => boolean. Yoksa her rota erişilebilir sayılır.
// - useHomeCrumb() → { label, path }. Breadcrumb'ın ilk halkası; yoksa "Ana Sayfa" (/).
// - ContextSwitcher: başlıkta gösterilen bağlam seçici (ör. müşteri panelinde site seçici).
// - HeaderActions: başlıkta tema düğmesinden önce gösterilen uygulamaya özel öğeler (ör. bildirim zili).
// - useCommandSearch(query) → { title, items: [{ id, label, hint?, path, icon? }], loading }. Komut paletinde sayfalara ek
//   olarak uygulama verisinde arama (ör. müşteri panelinde site içeriği). query boşsa sonuç dönmemelidir.
// - useDynamicMenuGroups() → [{ id, title, insertAfter?, items: [{ id, label, path (somut), icon }] }]. Veriden üretilen
//   menü grupları (ör. müşteri panelinde sitenin içerik bölümleri). insertAfter verilen grubun arkasına, yoksa sona eklenir.
const { routeGroups } = routesConfig;
const allowAll = () => true;
const NO_DYNAMIC_GROUPS = [];
const useAppRouteAccess = routesConfig.useRouteAccess ?? (() => allowAll);
const useAppDynamicGroups = routesConfig.useDynamicMenuGroups ?? (() => NO_DYNAMIC_GROUPS);
const DEFAULT_HOME_CRUMB = { label: "Ana Sayfa", path: "/" };

export const useHomeCrumb = routesConfig.useHomeCrumb ?? (() => DEFAULT_HOME_CRUMB);

export const ContextSwitcher = routesConfig.ContextSwitcher ?? null;

export const HeaderActions = routesConfig.HeaderActions ?? null;

const NO_COMMAND_RESULTS = { title: null, items: [], loading: false };
export const useCommandSearch = routesConfig.useCommandSearch ?? (() => NO_COMMAND_RESULTS);

const flattenItems = (items) => items.flatMap((item) => [item, ...flattenItems(item.children ?? [])]);

// Alt sayfaların öneki olan bir sayfa yalnız kendi yolunda etkin sayılır.
export const isExactRoute = (item) => item.end ?? item.path === "/";

const matchesPath = (item, pathname) => matchPath({ path: item.path, end: isExactRoute(item) }, pathname) !== null;

export const hasPathParams = (path) => path.split("/").some((segment) => segment.startsWith(":"));

const topLevelItems = routeGroups.flatMap((group) => group.items);

export const allRouteItems = flattenItems(topLevelItems);

// Kendi sayfası olmayan menü grubu da alt sayfaları üzerinden rotalanır.
export const pageRoutes = topLevelItems.filter((item) => item.load || (item.children ?? []).some((child) => child.load));

export const getRouteTrail = (pathname, items = topLevelItems) => {
  const match = items.find((item) => matchesPath(item, pathname));
  if (!match) return [];
  return [match, ...getRouteTrail(pathname, match.children ?? [])];
};

// Bulunulan adresteki parametreler (ör. siteId); parametreli bütün rotalar önek olarak denenir.
export const getCurrentParams = (pathname) => allRouteItems
  .filter((item) => hasPathParams(item.path))
  .reduce((params, item) => ({ ...(matchPath({ path: item.path, end: false }, pathname)?.params ?? {}), ...params }), {});

// Parametreli yol bulunulan adresin parametreleriyle doldurulur; eksik parametre varsa null döner (öğe gösterilmez).
export const resolveItemPath = (item, pathname, params = getCurrentParams(pathname)) => {
  let resolvable = true;
  const path = item.path.split("/").map((segment) => {
    if (!segment.startsWith(":")) return segment;
    const value = params[segment.slice(1)];
    if (!value) resolvable = false;
    return value ? encodeURIComponent(value) : segment;
  }).join("/");
  return resolvable ? path : null;
};

const toNavigationItems = (items, pathname, params, canAccess) => items
  .filter((item) => !item.hideInMenu && canAccess(item))
  .map((item) => {
    const path = resolveItemPath(item, pathname, params);
    if (!path) return null;
    const children = item.hideChildrenInMenu ? [] : toNavigationItems(item.children ?? [], pathname, params, canAccess);
    if (!item.load && (item.children?.length ?? 0) > 0 && children.length === 0) return null;
    return { ...item, path, children };
  })
  .filter(Boolean);

// Menü: erişilebilir, adresi çözülebilen ve menüde gizlenmemiş öğeler; yollar somut adreslerdir.
export const useMenuGroups = () => {
  const { pathname } = useLocation();
  const canAccess = useAppRouteAccess();
  const dynamicGroups = useAppDynamicGroups();
  return useMemo(() => {
    const params = getCurrentParams(pathname);
    const groups = routeGroups
      .filter((group) => !group.hidden)
      .map((group) => ({ ...group, items: toNavigationItems(group.items, pathname, params, canAccess) }));
    dynamicGroups.forEach((group) => {
      const index = groups.findIndex((item) => item.id === group.insertAfter);
      const entry = { ...group, items: group.items.map((item) => ({ children: [], ...item })) };
      if (index >= 0) groups.splice(index + 1, 0, entry);
      else groups.push(entry);
    });
    return groups.filter((group) => group.items.length > 0);
  }, [pathname, canAccess, dynamicGroups]);
};

// Komut paleti: kendi sayfası olan, erişilebilir ve bulunulan adresten çözülebilen bütün sayfalar.
export const useNavigablePages = () => {
  const { pathname } = useLocation();
  const canAccess = useAppRouteAccess();
  const dynamicGroups = useAppDynamicGroups();
  return useMemo(() => {
    const params = getCurrentParams(pathname);
    const staticPages = allRouteItems
      .filter((item) => item.load && !item.hideInMenu && canAccess(item))
      .map((item) => ({ item, path: resolveItemPath(item, pathname, params) }))
      .filter(({ path }) => path);
    const dynamicPages = dynamicGroups.flatMap((group) => group.items.map((item) => ({ item, path: item.path })));
    return [...staticPages, ...dynamicPages];
  }, [pathname, canAccess, dynamicGroups]);
};

export const useRouteAccess = useAppRouteAccess;
