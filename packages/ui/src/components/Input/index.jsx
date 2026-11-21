import { useId, useRef, useState } from "react";
import { FiEye, FiEyeOff, FiX } from "react-icons/fi";
import { cx } from "@/utils/cx";
import "./input.scss";

const setNativeValue = (element, nextValue) => {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  valueSetter.call(element, nextValue);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

const Input = ({
  label,
  optionalText,
  labelAction,
  error,
  success,
  hint,
  icon: Icon,
  iconPosition = "left",
  addonBefore,
  addonAfter,
  size = "md",
  variant = "default",
  radius = "md",
  fullWidth = true,
  disabled = false,
  readOnly = false,
  required = false,
  loading = false,
  clearable = false,
  onClear,
  showCount = false,
  maxLength,
  type = "text",
  id,
  value,
  defaultValue,
  onChange,
  className = "",
  ref,
  "aria-describedby": ariaDescribedBy,
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hintId = hint && !error && !success ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const successId = success && !error ? `${inputId}-success` : undefined;
  const countId = showCount ? `${inputId}-count` : undefined;
  const inputRef = useRef(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(() => String(defaultValue ?? ""));
  const [passwordVisible, setPasswordVisible] = useState(false);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? String(value ?? "") : uncontrolledValue;
  const isPassword = type === "password";
  const interactive = !disabled && !readOnly && !loading;
  const showClear = clearable && interactive && currentValue.length > 0;

  const assignRef = (node) => {
    inputRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const handleChange = (event) => {
    if (!isControlled) setUncontrolledValue(event.target.value);
    onChange?.(event);
  };

  const handleClear = () => {
    if (inputRef.current) {
      setNativeValue(inputRef.current, "");
      inputRef.current.focus();
    }
    onClear?.();
  };

  const classes = cx(
    "input",
    `input_${size}`,
    `input_variant_${variant}`,
    `input_radius_${radius}`,
    error && "input_has_error",
    success && !error && "input_has_success",
    disabled && "input_disabled",
    readOnly && "input_readonly",
    (addonBefore || addonAfter) && "input_with_addons",
    fullWidth && "input_full_width",
    className,
  );

  return (
    <div className={classes}>
      {label && (
        <div className="input_label_row">
          <label className="input_label" htmlFor={inputId}>
            {label}
            {required && <span className="input_required" aria-hidden="true">*</span>}
            {!required && optionalText && <span className="input_optional">{optionalText}</span>}
          </label>
          {labelAction && <span className="input_label_action">{labelAction}</span>}
        </div>
      )}

      <div className="input_group">
        {addonBefore && <span className="input_addon">{addonBefore}</span>}

        <div className="input_field">
          {Icon && iconPosition === "left" && <Icon className="input_icon" aria-hidden="true" />}

          <input
            ref={assignRef}
            id={inputId}
            type={isPassword && passwordVisible ? "text" : type}
            className="input_control"
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            maxLength={maxLength}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            aria-invalid={Boolean(error) || undefined}
            aria-busy={loading || undefined}
            aria-describedby={cx(hintId, errorId, successId, countId, ariaDescribedBy) || undefined}
            {...rest}
          />

          {loading && <span className="input_loader" aria-hidden="true" />}

          {showCount && (
            <span className="input_count" id={countId}>
              {currentValue.length}
              {maxLength ? `/${maxLength}` : ""}
            </span>
          )}

          {showClear && (
            <button type="button" className="input_action" onClick={handleClear} aria-label="Temizle">
              <FiX aria-hidden="true" />
            </button>
          )}

          {isPassword && !disabled && (
            <button
              type="button"
              className="input_action"
              onClick={() => setPasswordVisible((prev) => !prev)}
              aria-label={passwordVisible ? "Şifreyi gizle" : "Şifreyi göster"}
              aria-pressed={passwordVisible}
            >
              {passwordVisible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
            </button>
          )}

          {Icon && iconPosition === "right" && <Icon className="input_icon" aria-hidden="true" />}
        </div>

        {addonAfter && <span className="input_addon">{addonAfter}</span>}
      </div>

      {hintId && <span className="input_hint" id={hintId}>{hint}</span>}
      {error && <span className="input_error_message" id={errorId} role="alert">{error}</span>}
      {successId && <span className="input_success_message" id={successId}>{success}</span>}
    </div>
  );
};

export default Input;
