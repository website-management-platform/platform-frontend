import { useId } from "react";
import { cx } from "@/utils/cx";
import "./radio.scss";

const Radio = ({
  label,
  description,
  checked,
  disabled = false,
  size = "md",
  id,
  name,
  className = "",
  onChange,
  ...rest
}) => {
  const generatedId = useId();
  const radioId = id || generatedId;
  const descriptionId = description ? `${radioId}-description` : undefined;

  const control = (
    <label
      className={cx("radio", `radio_${size}`, disabled && "radio_disabled", !description && className)}
      htmlFor={radioId}
    >
      <span className="radio_box">
        <input
          id={radioId}
          type="radio"
          name={name}
          className="radio_input"
          checked={checked}
          disabled={disabled}
          aria-describedby={descriptionId}
          onChange={onChange}
          {...rest}
        />
        <span className="radio_indicator" aria-hidden="true" />
      </span>
      {label && <span className="radio_label">{label}</span>}
    </label>
  );

  if (!description) return control;

  return (
    <div className={cx("radio_field", `radio_field_${size}`, className)}>
      {control}
      <span className="radio_description" id={descriptionId}>{description}</span>
    </div>
  );
};

export default Radio;
