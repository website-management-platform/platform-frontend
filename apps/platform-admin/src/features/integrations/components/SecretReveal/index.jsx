import { FiKey } from "react-icons/fi";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import CopyButton from "@/components/CopyButton";
import Modal from "@/components/Modal";

/** Gizli değer yalnız bir kez gösterilir (sunucu yalnız özetini saklar); pencere kapanınca bir daha görülemez. */
const SecretReveal = ({ title, secret, description, onClose }) => (
  <Modal
    open
    onClose={onClose}
    icon={FiKey}
    title={title}
    description={description}
    closeOnOverlayClick={false}
    footer={<Button onClick={onClose}>Kaydettim, kapat</Button>}
  >
    <Alert variant="warning" size="compact">Bu değer bir daha gösterilmez. Şimdi kopyalayıp güvenli bir yerde (sunucu ortam değişkeni, sır kasası) saklayın.</Alert>
    <div className="integration_secret">
      <code className="integration_secret_value">{secret}</code>
      <CopyButton value={secret} label="Kopyala" />
    </div>
  </Modal>
);

export default SecretReveal;
