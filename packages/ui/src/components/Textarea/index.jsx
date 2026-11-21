import { useId, useLayoutEffect, useRef, useState } from "react";
import { cx } from "@/utils/cx";
import "./textarea.scss";

const Textarea = ({
  label,
  optionalText,
  labelAction,
  error,
  success,
  hint,
  rows = 4,
  autoResize = false,
  resize: resizeMode = "vertical",
  variant = "default",
  readOnly = false,
  maxLength,
  size = "md",
  fullWidth = true,
  disabled = false,
  required = false,
  id,
  className = "",
  onChange,
  value,
  defaultValue,
  "aria-describedby": ariaDescribedBy,
  ...rest
}) => {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const hintId = hint && !error && !success ? `${textareaId}-hint` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;
  const successId = success && !error ? `${textareaId}-success` : undefined;
  const counterId = maxLength ? `${textareaId}-counter` : undefined;
  const textareaRef = useRef(null);
  const [uncontrolledLength, setUncontrolledLength] = useState(() => String(defaultValue ?? "").length);

  const isControlled = value !== undefined;
  const currentLength = isControlled ? String(value ?? "").length : uncontrolledLength;

  const resize = (element) => {
    if (!autoResize || !element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    resize(textareaRef.current);
  });

  const handleInput = (event) => {
    if (!isControlled) setUncontrolledLength(event.target.value.length);
    resize(event.target);
    onChange?.(event);
  };

  const classes = cx(
    "textarea",
    `textarea_${size}`,
    error ? "textarea_has_error" : "",
    success && !error ? "textarea_has_success" : "",
    disabled ? "textarea_disabled" : "",
    readOnly && "textarea_readonly",
    `textarea_variant_${variant}`,
    fullWidth ? "textarea_full_width" : "",
    className,
  );

  return (
    <div className={classes}>
      {label && (
        <div className="textarea_label_row">
          <label className="textarea_label" htmlFor={textareaId}>
            {label}
            {required && <span className="textarea_required" aria-hidden="true">*</span>}
            {!required && optionalText && <span className="textarea_optional">{optionalText}</span>}
          </label>
          {labelAction && <span className="textarea_label_action">{labelAction}</span>}
        </div>
      )}

      <textarea
        ref={textareaRef}
        id={textareaId}
        className={cx("textarea_control", autoResize ? "textarea_control_auto_resize" : `textarea_resize_${resizeMode}`)}
        rows={rows}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={handleInput}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={cx(hintId, errorId, successId, counterId, ariaDescribedBy) || undefined}
        {...rest}
      />

      <div className="textarea_footer">
        <div>
          {hint && !error && !success && (
            <span className="textarea_hint" id={hintId}>{hint}</span>
          )}
          {error && (
            <span className="textarea_error_message" id={errorId} role="alert">{error}</span>
          )}
          {success && !error && (
            <span className="textarea_success_message" id={successId}>{success}</span>
          )}
        </div>
        {maxLength && (
          <span className="textarea_counter" id={counterId}>{currentLength}/{maxLength}</span>
        )}
      </div>
    </div>
  );
};

export default Textarea;
