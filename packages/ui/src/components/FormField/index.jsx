import { cloneElement, isValidElement, useId } from "react";
import { cx } from "@/utils/cx";
import "./form_field.scss";

const FormField = ({
  label,
  optionalText,
  labelAction,
  hint,
  error,
  success,
  required = false,
  orientation = "vertical",
  id,
  className = "",
  children,
}) => {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const labelId = `${fieldId}-label`;
  const hintId = hint && !error && !success ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const successId = success && !error ? `${fieldId}-success` : undefined;

  const childProps = isValidElement(children) ? children.props : {};
  const effectiveId = childProps.id || fieldId;
  const fieldProps = {
    id: effectiveId,
    "aria-labelledby": cx(labelId, childProps["aria-labelledby"]) || undefined,
    "aria-describedby": cx(hintId, errorId, successId, childProps["aria-describedby"]) || undefined,
    "aria-invalid": Boolean(error) || childProps["aria-invalid"] || undefined,
    "aria-required": required || childProps["aria-required"] || undefined,
  };

  let control = children;
  if (typeof children === "function") control = children(fieldProps);
  else if (isValidElement(children)) control = cloneElement(children, fieldProps);

  return (
    <div className={cx("form_field", `form_field_${orientation}`, error && "form_field_has_error", className)}>
      <div className="form_field_label_row">
        <label className="form_field_label" id={labelId} htmlFor={effectiveId}>
          {label}
          {required && <span className="form_field_required" aria-hidden="true">*</span>}
          {!required && optionalText && <span className="form_field_optional">{optionalText}</span>}
        </label>
        {labelAction && <span className="form_field_label_action">{labelAction}</span>}
      </div>
      <div className="form_field_control">{control}</div>
      {hintId && <span className="form_field_hint" id={hintId}>{hint}</span>}
      {error && <span className="form_field_error" id={errorId} role="alert">{error}</span>}
      {successId && <span className="form_field_success" id={successId}>{success}</span>}
    </div>
  );
};

export default FormField;
