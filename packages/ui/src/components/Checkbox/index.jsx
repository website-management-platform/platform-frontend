import { useEffect, useId, useRef } from "react";
import { FiCheck, FiMinus } from "react-icons/fi";
import { cx } from "@/utils/cx";
import "./checkbox.scss";

const Checkbox = ({
  label,
  description,
  error,
  checked,
  indeterminate = false,
  disabled = false,
  size = "md",
  id,
  className = "",
  onChange,
  ...rest
}) => {
  const generatedId = useId();
  const checkboxId = id || generatedId;
  const descriptionId = description ? `${checkboxId}-description` : undefined;
  const errorId = error ? `${checkboxId}-error` : undefined;
  const inputRef = useRef(null);
  const hasMessages = Boolean(description || error);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const control = (
    <label
      className={cx(
        "checkbox",
        `checkbox_${size}`,
        indeterminate && "checkbox_indeterminate",
        disabled && "checkbox_disabled",
        !hasMessages && className,
      )}
      htmlFor={checkboxId}
    >
      <span className="checkbox_box">
        <input
          ref={inputRef}
          id={checkboxId}
          type="checkbox"
          className="checkbox_input"
          checked={checked}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={cx(descriptionId, errorId) || undefined}
          onChange={onChange}
          {...rest}
        />
        <span className="checkbox_indicator" aria-hidden="true">
          <FiCheck className="checkbox_icon_check" />
          <FiMinus className="checkbox_icon_indeterminate" />
        </span>
      </span>
      {label && <span className="checkbox_label">{label}</span>}
    </label>
  );

  if (!hasMessages) return control;

  return (
    <div className={cx("checkbox_field", `checkbox_field_${size}`, className)}>
      {control}
      {description && <span className="checkbox_description" id={descriptionId}>{description}</span>}
      {error && <span className="checkbox_error_message" id={errorId} role="alert">{error}</span>}
    </div>
  );
};

export default Checkbox;
