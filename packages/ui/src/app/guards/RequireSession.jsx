import { Navigate, Outlet, useLocation } from "react-router";
import FullPageState from "@/components/FullPageState";
import ServerError from "@/pages/ServerError";
import { useSession } from "@/auth/api";
import { buildLoginPath } from "@/utils/returnTo";

const RequireSession = ({ children }) => {
  const sessionQuery = useSession();
  const location = useLocation();

  if (sessionQuery.isPending) return <FullPageState loading label="Oturum kontrol ediliyor" />;
  if (sessionQuery.isError) return <ServerError onRetry={() => sessionQuery.refetch()} error={sessionQuery.error} />;
  if (!sessionQuery.data) return <Navigate to={buildLoginPath(location)} replace />;

  return children ?? <Outlet />;
};

export default RequireSession;
