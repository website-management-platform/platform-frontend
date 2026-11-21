import { useState } from "react";
import FieldGroup from "@/components/FieldGroup";
import Checkbox from "@/components/Checkbox";
import ChoiceCard from "@/components/ChoiceCard";

const CheckboxGroup = ({
  label,
  hideLabel = false,
  description,
  error,
  name,
  options,
  value,
  defaultValue = [],
  onChange,
  variant = "default",
  orientation = "vertical",
  columns,
  size = "md",
  required = false,
  disabled = false,
  className = "",
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const selectedValues = isControlled ? value : uncontrolledValue;

  const handleToggle = (optionValue) => {
    const nextValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((item) => item !== optionValue)
      : [...selectedValues, optionValue];
    if (!isControlled) setUncontrolledValue(nextValues);
    onChange?.(nextValues);
  };

  return (
    <FieldGroup
      legend={label}
      hideLegend={hideLabel}
      description={description}
      error={error}
      required={required}
      layout={columns ? "grid" : orientation}
      columns={columns}
      disabled={disabled}
      className={className}
    >
      {options.map((option) => {
        const optionProps = {
          name,
          value: option.value,
          checked: selectedValues.includes(option.value),
          disabled: disabled || option.disabled,
          onChange: () => handleToggle(option.value),
          label: option.label,
          description: option.description,
        };

        return variant === "card"
          ? <ChoiceCard key={option.value} meta={option.meta} badge={option.badge} type="checkbox" icon={option.icon} {...optionProps} />
          : <Checkbox key={option.value} size={size} {...optionProps} />;
      })}
    </FieldGroup>
  );
};

export default CheckboxGroup;
