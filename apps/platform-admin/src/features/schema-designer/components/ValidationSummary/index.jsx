import { useState } from "react";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import Button from "@/components/Button";
import "./validation_summary.scss";

/** Yayını engelleyen şema hataları; tıklanınca ilgili alan seçilir (şartname §25.2: hatalar alan yoluyla gösterilir). */
const ValidationSummary = ({ errors, onSelectError, describe }) => {
  const [expanded, setExpanded] = useState(false);
  if (errors.length === 0) {
    return <p className="validation_summary validation_summary_ok" role="status"><FiCheckCircle aria-hidden="true" /> Yapı yayına hazır; doğrulama hatası yok.</p>;
  }
  const shown = expanded ? errors : errors.slice(0, 3);
  return (
    <div className="validation_summary validation_summary_errors" role="status">
      <p className="validation_summary_title"><FiAlertCircle aria-hidden="true" /> {errors.length} hata yayını engelliyor. Taslak yine kaydedilir.</p>
      <ul className="validation_summary_list">
        {shown.map((error, index) => (
          <li key={`${error.path}-${error.code}-${index}`}>
            <button type="button" className="validation_summary_item" onClick={() => onSelectError(error)}>
              <span className="validation_summary_where">{describe(error)}</span>
              <span>{error.message}</span>
            </button>
          </li>
        ))}
      </ul>
      {errors.length > 3 && <Button variant="link" size="sm" onClick={() => setExpanded((value) => !value)}>{expanded ? "Daha az göster" : `Tümünü göster (${errors.length})`}</Button>}
    </div>
  );
};

export default ValidationSummary;
