import { Link } from "react-router";
import { FiHome, FiLock } from "react-icons/fi";
import Button from "@/components/Button";
import StatusPage from "@/components/StatusPage";
import { usePageTitle } from "@/hooks/usePageTitle";

const Forbidden = () => {
  usePageTitle("Erişim yok");
  return (
    <StatusPage
      icon={FiLock}
      tone="warning"
      code="Hata 403"
      title="Bu sayfaya erişiminiz yok"
      description="Hesabınızın bu sayfayı görme yetkisi bulunmuyor. Yetkiye ihtiyacınız varsa yöneticinize başvurun."
      actions={<Button as={Link} to="/" icon={FiHome}>Ana sayfaya dön</Button>}
    />
  );
};

export default Forbidden;
