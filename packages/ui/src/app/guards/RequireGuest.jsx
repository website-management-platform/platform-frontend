import { Navigate, Outlet, useSearchParams } from "react-router";
import FullPageState from "@/components/FullPageState";
import { useSession } from "@/auth/api";
import { safeReturnTo } from "@/utils/returnTo";

const RequireGuest = () => {
  const sessionQuery = useSession();
  const [searchParams] = useSearchParams();

  if (sessionQuery.isPending) return <FullPageState loading label="Oturum kontrol ediliyor" />;
  if (sessionQuery.data) return <Navigate to={safeReturnTo(searchParams.get("returnTo"))} replace />;

  return <Outlet />;
};

export default RequireGuest;
