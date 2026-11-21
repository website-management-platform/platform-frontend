import { Link, useNavigate } from "react-router";
import { FiArrowLeft, FiCompass, FiHome } from "react-icons/fi";
import Button from "@/components/Button";
import StatusPage from "@/components/StatusPage";
import { usePageTitle } from "@/hooks/usePageTitle";

const NotFound = () => {
  usePageTitle("Sayfa bulunamadı");
  const navigate = useNavigate();
  return (
    <StatusPage
      icon={FiCompass}
      code="Hata 404"
      title="Sayfa bulunamadı"
      description="Aradığınız sayfa taşınmış, kaldırılmış ya da bağlantı hatalı olabilir."
      actions={(
        <>
          <Button as={Link} to="/" icon={FiHome}>Ana sayfaya dön</Button>
          <Button variant="outline" icon={FiArrowLeft} onClick={() => navigate(-1)}>Geri dön</Button>
        </>
      )}
    />
  );
};

export default NotFound;
