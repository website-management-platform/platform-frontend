import { useId, useState } from "react";
import FieldGroup from "@/components/FieldGroup";
import Radio from "@/components/Radio";
import ChoiceCard from "@/components/ChoiceCard";

const RadioGroup = ({
  label,
  hideLabel = false,
  description,
  error,
  name,
  options,
  value,
  defaultValue,
  onChange,
  variant = "default",
  orientation = "vertical",
  columns,
  size = "md",
  required = false,
  disabled = false,
  className = "",
}) => {
  const generatedName = useId();
  const groupName = name || generatedName;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? null);
  const isControlled = value !== undefined;
  const selectedValue = isControlled ? value : uncontrolledValue;

  const handleChange = (optionValue) => {
    if (!isControlled) setUncontrolledValue(optionValue);
    onChange?.(optionValue);
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
          name: groupName,
          value: option.value,
          checked: selectedValue === option.value,
          disabled: disabled || option.disabled,
          required,
          onChange: () => handleChange(option.value),
          label: option.label,
          description: option.description,
        };

        return variant === "card"
          ? <ChoiceCard key={option.value} meta={option.meta} badge={option.badge} type="radio" icon={option.icon} {...optionProps} />
          : <Radio key={option.value} size={size} {...optionProps} />;
      })}
    </FieldGroup>
  );
};

export default RadioGroup;
