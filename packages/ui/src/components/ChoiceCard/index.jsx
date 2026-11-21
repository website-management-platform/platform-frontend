import { useId } from "react";
import { FiCheck } from "react-icons/fi";
import { cx } from "@/utils/cx";
import "./choice_card.scss";

const ChoiceCard = ({
  type = "radio",
  label,
  description,
  icon: Icon,
  meta,
  badge,
  checked,
  disabled = false,
  id,
  className = "",
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const titleId = `${inputId}-title`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const badgeId = badge ? `${inputId}-badge` : undefined;
  const metaId = meta ? `${inputId}-meta` : undefined;
  const describedBy = [badgeId, descriptionId, metaId].filter(Boolean).join(" ") || undefined;

  return (
    <label
      className={cx("choice_card", `choice_card_${type}`, disabled && "choice_card_disabled", className)}
      htmlFor={inputId}
      // Seçili görünüm `:has(:checked)` ile de çizilir; durum kodla toplu değiştiğinde (ör. "hepsini seç") tarayıcı bu
      // seçiciyi her zaman yeniden hesaplamaz. Kontrollü kullanımda öznitelik görünümü kesinleştirir.
      data-checked={checked ? "" : undefined}
    >
      <input
        id={inputId}
        type={type}
        className="choice_card_input"
        checked={checked}
        disabled={disabled}
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        {...rest}
      />
      <span className={cx("choice_card_layout", Icon && "choice_card_layout_with_icon")}>
        {Icon && (
          <span className="choice_card_icon" aria-hidden="true">
            <Icon />
          </span>
        )}
        <span className="choice_card_text">
          <span className="choice_card_title_row">
            <span className="choice_card_title" id={titleId}>{label}</span>
            {badge && <span className="choice_card_badge" id={badgeId}>{badge}</span>}
          </span>
          {description && <span className="choice_card_description" id={descriptionId}>{description}</span>}
        </span>
        {meta && <span className="choice_card_meta" id={metaId}>{meta}</span>}
        <span className="choice_card_indicator" aria-hidden="true">
          {type === "checkbox" && <FiCheck />}
        </span>
      </span>
    </label>
  );
};

export default ChoiceCard;
