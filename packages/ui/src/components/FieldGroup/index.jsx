import { useId } from "react";
import { cx } from "@/utils/cx";
import "./field_group.scss";

const FieldGroup = ({
  legend,
  hideLegend = false,
  description,
  error,
  required = false,
  invalid = false,
  optionalText,
  layout = "vertical",
  columns = 2,
  disabled = false,
  className = "",
  children,
}) => {
  const groupId = useId();
  const descriptionId = description ? `${groupId}-description` : undefined;
  const errorId = error ? `${groupId}-error` : undefined;

  return (
    <fieldset
      className={cx("field_group", className)}
      disabled={disabled}
      aria-invalid={Boolean(error) || invalid || undefined}
      aria-describedby={cx(descriptionId, errorId) || undefined}
    >
      {legend && (
        <legend className={cx("field_group_legend", hideLegend && "visually_hidden")}>
          {legend}
          {required && (
            <>
              <span className="field_group_required" aria-hidden="true">*</span>
              <span className="visually_hidden"> (zorunlu)</span>
            </>
          )}
          {!required && optionalText && <span className="field_group_optional">{optionalText}</span>}
        </legend>
      )}
      {description && <p className="field_group_description" id={descriptionId}>{description}</p>}
      <div
        className={cx(
          "field_group_content",
          `field_group_content_${layout}`,
          layout === "grid" && `field_group_columns_${columns}`,
        )}
      >
        {children}
      </div>
      {error && <span className="field_group_error" id={errorId} role="alert">{error}</span>}
    </fieldset>
  );
};

export default FieldGroup;
