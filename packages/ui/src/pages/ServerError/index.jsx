import { Link, useRouteError } from "react-router";
import { FiAlertTriangle, FiHome, FiRefreshCw } from "react-icons/fi";
import Button from "@/components/Button";
import StatusPage from "@/components/StatusPage";
import { usePageTitle } from "@/hooks/usePageTitle";

const reloadPage = () => window.location.reload();

// Beklenmeyen hata: ne olduğunu, ne yapılacağını ve (sunucu hatasıysa) destek ekibine iletilecek kodu gösterir.
const ServerError = ({ onRetry = reloadPage, error = null, inRouter = true }) => {
  usePageTitle("Bir şeyler ters gitti");
  return (
    <StatusPage
      icon={FiAlertTriangle}
      tone="danger"
      code="Beklenmeyen hata"
      title="Bir şeyler ters gitti"
      description="İsteğiniz tamamlanamadı. Sayfayı yenileyerek tekrar deneyin; sorun sürerse aşağıdaki destek kodunu bize iletin."
      traceId={error?.requestId ?? null}
      actions={(
        <>
          <Button icon={FiRefreshCw} onClick={onRetry}>Sayfayı yenile</Button>
          {inRouter && <Button as={Link} to="/" variant="outline" icon={FiHome}>Ana sayfaya dön</Button>}
        </>
      )}
    />
  );
};

// Yönlendiricinin hata öğesi: hatayı rota bağlamından alır (destek kodu için).
export const RouteServerError = () => <ServerError error={useRouteError()} />;

export default ServerError;
