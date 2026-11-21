import { useState } from "react";
import { cx } from "@/utils/cx";
import "./toggle_group.scss";

const ToggleGroup = ({
  items,
  type = "single",
  value,
  defaultValue,
  onChange,
  size = "md",
  variant = "outline",
  ariaLabel,
  className = "",
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? (type === "multiple" ? [] : null));
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;

  const isPressed = (itemValue) => (
    type === "multiple" ? currentValue.includes(itemValue) : currentValue === itemValue
  );

  const handleToggle = (itemValue) => {
    let nextValue;
    if (type === "multiple") {
      nextValue = currentValue.includes(itemValue)
        ? currentValue.filter((entry) => entry !== itemValue)
        : [...currentValue, itemValue];
    } else {
      nextValue = currentValue === itemValue ? null : itemValue;
    }
    if (!isControlled) setUncontrolledValue(nextValue);
    onChange?.(nextValue);
  };

  return (
    <div
      className={cx("toggle_group", `toggle_group_${variant}`, `toggle_group_${size}`, className)}
      role="group"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const pressed = isPressed(item.value);
        return (
          <button
            key={item.value}
            type="button"
            className={cx("toggle_group_item", pressed && "toggle_group_item_pressed")}
            aria-pressed={pressed}
            aria-label={item.label ? undefined : item.ariaLabel}
            disabled={item.disabled}
            onClick={() => handleToggle(item.value)}
          >
            {Icon && <Icon className="toggle_group_icon" aria-hidden="true" />}
            {item.label && <span>{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ToggleGroup;
