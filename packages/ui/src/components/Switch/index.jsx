import { useId } from "react";
import { cx } from "@/utils/cx";
import "./switch.scss";

const Switch = ({
  label,
  description,
  checked,
  disabled = false,
  size = "md",
  color = "accent",
  loading = false,
  id,
  className = "",
  onChange,
  onClick,
  ...rest
}) => {
  const generatedId = useId();
  const switchId = id || generatedId;
  const descriptionId = description ? `${switchId}-description` : undefined;

  const control = (
    <label
      className={cx(
        "switch",
        `switch_${size}`,
        `switch_color_${color}`,
        (disabled || loading) && "switch_disabled",
        loading && "switch_loading",
        !description && className,
      )}
      htmlFor={switchId}
    >
      <span className="switch_track">
        <input
          id={switchId}
          type="checkbox"
          role="switch"
          className="switch_input"
          checked={checked}
          disabled={disabled}
          aria-disabled={loading || undefined}
          aria-busy={loading || undefined}
          onClick={loading ? (event) => event.preventDefault() : onClick}
          aria-describedby={descriptionId}
          onChange={onChange}
          {...rest}
        />
        <span className="switch_thumb" aria-hidden="true">
          {loading && <span className="switch_spinner" />}
        </span>
      </span>
      {label && <span className="switch_label">{label}</span>}
    </label>
  );

  if (!description) return control;

  return (
    <div className={cx("switch_field", `switch_field_${size}`, className)}>
      {control}
      <span className="switch_description" id={descriptionId}>{description}</span>
    </div>
  );
};

export default Switch;
