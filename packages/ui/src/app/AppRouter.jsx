import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { RouterProvider } from "react-router/dom";
import MainLayout from "@/layouts/MainLayout";
import AuthLayout from "@/layouts/AuthLayout";
import RouteProgress from "@/layouts/MainLayout/components/RouteProgress";
import NotFound from "@/pages/NotFound";
import { RouteServerError } from "@/pages/ServerError";
import * as routesConfig from "@/config/routes.config";
import RequireAccess from "./guards/RequireAccess";
import RequireGuest from "./guards/RequireGuest";
import RequireSession from "./guards/RequireSession";
import RootRoute from "./RootRoute";
import { pageRoutes } from "./routing";

const toRelativePath = (parentPath, path) => path.slice(`${parentPath}/`.length);

const getRoutableChildren = (item) => (item.children ?? []).filter((child) => child.load);

const lazyPage = (load, item) => ({
  lazy: async () => {
    const Page = (await load()).default;
    return { Component: item ? () => <RequireAccess item={item}><Page /></RequireAccess> : Page };
  },
  hydrateFallbackElement: <RouteProgress />,
  errorElement: <RouteServerError />,
});

const getPageRouteProps = (item) => (item.load ? lazyPage(item.load, item) : { element: <Outlet /> });

const buildRoute = (item, parentPath) => {
  const path = parentPath ? toRelativePath(parentPath, item.path) : item.path;
  const routableChildren = getRoutableChildren(item);
  const routeProps = {
    id: item.id,
    errorElement: <RouteServerError />,
    ...getPageRouteProps(item),
  };

  if (routableChildren.length === 0) {
    return {
      ...routeProps,
      path: item.children?.length ? `${path}/*` : path,
    };
  }

  if (item.indexPage) {
    return {
      id: item.id,
      path,
      element: <Outlet />,
      errorElement: <RouteServerError />,
      children: [
        { index: true, ...lazyPage(item.load, item) },
        ...routableChildren.map((child) => buildRoute(child, item.path)),
      ],
    };
  }

  // Mutlak yol: göreli hedef "*" altında eşleşmeyen segmente eklenir ve sonsuz yönlendirmeye girer.
  const defaultChildPath = routableChildren[0].path;

  return {
    ...routeProps,
    path,
    children: [
      { index: true, element: <Navigate to={defaultChildPath} replace /> },
      ...routableChildren.map((child) => buildRoute(child, item.path)),
      { path: "*", element: <Navigate to={defaultChildPath} replace /> },
    ],
  };
};

const toStandaloneRoute = ({ path, load }) => ({ path, ...lazyPage(load) });

// Uygulamalar routes.config içinde isteğe bağlı olarak ek rotalar tanımlar:
// publicRoutes (oturumsuz, giriş düzeninde; ör. davet kabulü), sessionRoutes (oturumlu, ana kabuk dışında; ör. site seçimi),
// SessionScope (oturumlu ana kabuğu saran bağlam; ör. müşteri panelinde site bağlamı).
const publicRoutes = (routesConfig.publicRoutes ?? []).map(toStandaloneRoute);
const sessionRoutes = (routesConfig.sessionRoutes ?? []).map(toStandaloneRoute);
const SessionScope = routesConfig.SessionScope ?? Outlet;

const devRoutes = import.meta.env.DEV
  ? [{ path: "/dev/posta-kutusu", ...lazyPage(() => import("@/devtools/pages/Mailbox")) }]
  : [];

const router = createBrowserRouter([
  {
    element: <RootRoute />,
    errorElement: <RouteServerError />,
    children: [
      {
        element: <RequireGuest />,
        children: [{
          element: <AuthLayout />,
          children: [{ path: "/giris", ...lazyPage(() => import("@/auth/pages/Login")) }],
        }],
      },
      {
        element: <AuthLayout />,
        children: [
          { path: "/sifremi-unuttum", ...lazyPage(() => import("@/auth/pages/ForgotPassword")) },
          { path: "/sifre-sifirla", ...lazyPage(() => import("@/auth/pages/ResetPassword")) },
          ...publicRoutes,
        ],
      },
      ...devRoutes,
      {
        element: <RequireSession />,
        children: [
          ...sessionRoutes,
          {
            element: <SessionScope />,
            children: [{
              element: <MainLayout />,
              children: [
                ...pageRoutes.map((route) => buildRoute(route)),
                { path: "*", element: <NotFound /> },
              ],
            }],
          },
        ],
      },
    ],
  },
]);

const AppRouter = () => <RouterProvider router={router} />;

export default AppRouter;
