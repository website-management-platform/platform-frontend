import { FiAlertTriangle, FiCheck, FiLoader } from "react-icons/fi";
import Button from "@/components/Button";
import { getErrorMessage } from "@/api/errors";
import { cx } from "@/utils/cx";
import "./autosave_status.scss";

const MESSAGES = {
  saved: "Taslak kaydedildi",
  dirty: "Değişiklikler kaydedilecek…",
  saving: "Kaydediliyor…",
};

/** Otomatik kayıt durumu; çakışmada sunucudaki taslağı yükleme, hatada yeniden deneme sunar. */
const AutosaveStatus = ({ status, error, onRetry, onReload }) => {
  if (status === "conflict") {
    return (
      <div className="autosave_status autosave_status_conflict" role="alert">
        <FiAlertTriangle aria-hidden="true" />
        <span>Taslak başka bir oturumda değişti. Değişiklikleriniz kaydedilmedi.</span>
        <Button size="sm" variant="outline" onClick={onReload}>Güncel taslağı yükle</Button>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="autosave_status autosave_status_error" role="alert">
        <FiAlertTriangle aria-hidden="true" />
        <span>{getErrorMessage(error, "Taslak kaydedilemedi.")}</span>
        <Button size="sm" variant="outline" onClick={onRetry}>Tekrar dene</Button>
      </div>
    );
  }
  const Icon = status === "saved" ? FiCheck : FiLoader;
  return (
    <p className={cx("autosave_status", `autosave_status_${status}`)} role="status" aria-live="polite">
      <Icon aria-hidden="true" /> {MESSAGES[status]}
    </p>
  );
};

export default AutosaveStatus;
