import { useRef, useState } from "react";
import { cx } from "@/utils/cx";
import "./segmented_control.scss";

const SegmentedControl = ({
  options,
  value,
  defaultValue,
  onChange,
  size = "md",
  fullWidth = false,
  ariaLabel,
  className = "",
  ...rest
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? options[0]?.value);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;
  const itemRefs = useRef(new Map());
  const enabledOptions = options.filter((option) => !option.disabled);
  const focusableValue = enabledOptions.some((option) => option.value === currentValue)
    ? currentValue
    : enabledOptions[0]?.value;

  const handleSelect = (optionValue) => {
    if (!isControlled) setUncontrolledValue(optionValue);
    onChange?.(optionValue);
  };

  const focusOption = (fromIndex, direction) => {
    const enabledIndexes = options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !option.disabled)
      .map(({ index }) => index);
    if (enabledIndexes.length === 0) return;

    const currentPos = enabledIndexes.indexOf(fromIndex);
    const nextPos = (currentPos + direction + enabledIndexes.length) % enabledIndexes.length;
    const nextIndex = enabledIndexes[nextPos];
    const nextOption = options[nextIndex];
    handleSelect(nextOption.value);
    itemRefs.current.get(nextOption.value)?.focus();
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(index, 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(index, -1);
    }
  };

  const classes = cx(
    "segmented_control",
    `segmented_control_${size}`,
    fullWidth ? "segmented_control_full_width" : "",
    className,
  );

  return (
    <div className={classes} role="radiogroup" aria-label={ariaLabel} {...rest}>
      {options.map((option, index) => {
        const Icon = option.icon;
        const selected = option.value === currentValue;
        return (
          <button
            key={option.value}
            ref={(node) => {
              if (node) itemRefs.current.set(option.value, node);
              else itemRefs.current.delete(option.value);
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label ? undefined : option.ariaLabel}
            disabled={option.disabled}
            tabIndex={option.value === focusableValue ? 0 : -1}
            className={`segmented_control_item ${selected ? "segmented_control_item_selected" : ""}`}
            onClick={() => !option.disabled && handleSelect(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {Icon && <Icon className="segmented_control_icon" aria-hidden="true" />}
            {option.label && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
