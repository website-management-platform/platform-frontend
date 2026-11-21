import Alert from "@/components/Alert";
import Link from "@/components/Link";
import { IS_DEV_TOOLS } from "../../api";

const MailboxHint = () => {
  if (!IS_DEV_TOOLS) return null;
  return (
    <Alert variant="info" size="compact" title="Geliştirme ortamı">
      Gerçek e-posta gönderilmez. Gönderilen e-postaları <Link to="/dev/posta-kutusu">geliştirme posta kutusunda</Link> görebilirsiniz.
    </Alert>
  );
};

export default MailboxHint;
