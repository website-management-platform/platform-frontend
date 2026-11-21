import { useId } from "react";
import ReactSelect, { components as selectPrimitives } from "react-select";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import { cx } from "@/utils/cx";
import "./select.scss";

const selectComponents = {
  DropdownIndicator: (props) => (
    <div className="select_dropdown_indicator" {...props.innerProps}>
      <FiChevronDown aria-hidden="true" />
    </div>
  ),
  ClearIndicator: (props) => (
    <div className="select_clear_indicator" {...props.innerProps}>
      <span aria-hidden="true">×</span>
    </div>
  ),
  IndicatorSeparator: () => null,
  MultiValueRemove: (props) => (
    <selectPrimitives.MultiValueRemove
      {...props}
      innerProps={{ ...props.innerProps, "aria-label": `${props.data.label} seçimini kaldır` }}
    />
  ),
  Input: (props) => (
    <selectPrimitives.Input
      {...props}
      aria-describedby={cx(props["aria-describedby"], props.selectProps.fieldDescribedBy) || undefined}
    />
  ),
  Option: (props) => {
    const OptionIcon = props.data.icon;
    return (
      <div
        ref={props.innerRef}
        {...props.innerProps}
        className={cx(
          "select_option",
          props.isFocused && "select_option_focused",
          props.isSelected && "select_option_selected",
          props.isDisabled && "select_option_disabled",
        )}
      >
        {OptionIcon && <OptionIcon className="select_option_icon" aria-hidden="true" />}
        <span className="select_option_content">
          <span className="select_option_label">{props.label}</span>
          {props.data.description && <span className="select_option_description">{props.data.description}</span>}
        </span>
        {props.isSelected && <FiCheck className="select_option_check" aria-hidden="true" />}
      </div>
    );
  },
};

const positionOf = (items, item) => (items?.length ? `${items.length} öğeden ${items.indexOf(item) + 1}.` : "");

const ariaLiveMessages = {
  guidance: ({ context, isSearchable, isMulti, isInitialFocus, tabSelectsValue, ...props }) => {
    if (context === "menu") return `Seçenekler arasında yukarı ve aşağı oklarla gezinin, seçmek için Enter, menüyü kapatmak için Escape tuşuna basın${tabSelectsValue ? "; Tab tuşu seçip menüyü kapatır" : ""}.`;
    if (context === "input" && isInitialFocus) {
      return [
        `${props["aria-label"] || "Seçim alanı"} odakta`,
        isSearchable && "listeyi daraltmak için yazın",
        "menüyü açmak için aşağı oka basın",
        isMulti && "seçili değerlere gitmek için sol oka basın",
      ].filter(Boolean).join(", ") + ".";
    }
    if (context === "value") return "Seçili değerler arasında sol ve sağ oklarla gezinin, odaktaki değeri kaldırmak için Backspace tuşuna basın.";
    return "";
  },
  onChange: ({ action, label = "", labels = [], isDisabled }) => {
    if (["deselect-option", "pop-value", "remove-value"].includes(action)) return `${label} seçimi kaldırıldı.`;
    if (action === "clear") return "Tüm seçimler temizlendi.";
    if (action === "initial-input-focus") return `${labels.join(", ")} seçili.`;
    if (action === "select-option") return isDisabled ? `${label} seçilemez. Başka bir seçenek seçin.` : `${label} seçildi.`;
    return "";
  },
  onFocus: ({ context, focused, options, label = "", selectValue, isDisabled, isSelected, isAppleDevice }) => {
    if (context === "value" && selectValue) return `${label} değeri odakta, ${positionOf(selectValue, focused)}`;
    if (context === "menu" && isAppleDevice) return `${label}${isSelected ? " seçili" : ""}${isDisabled ? " devre dışı" : ""}, ${positionOf(options, focused)}`;
    return "";
  },
  onFilter: ({ inputValue, resultsMessage }) => `${resultsMessage}${inputValue ? ` (aranan: ${inputValue})` : ""}.`,
};

const screenReaderStatus = ({ count }) => `${count} sonuç bulundu`;

const APP_CONTROLLED_STYLES = {
  control: ["minHeight", "cursor"],
  valueContainer: ["display"],
  multiValue: ["display"],
  multiValueRemove: ["display"],
  loadingIndicator: ["marginRight"],
  menu: ["zIndex"],
  menuPortal: ["zIndex"],
};

const omitProperties = (base, properties) => {
  const nextStyles = { ...base };
  properties.forEach((property) => {
    delete nextStyles[property];
  });
  return nextStyles;
};

const mergeStyles = (styles) => ({
  ...styles,
  ...Object.fromEntries(
    Object.entries(APP_CONTROLLED_STYLES).map(([key, properties]) => [
      key,
      (base, state) => {
        const nextStyles = omitProperties(base, properties);
        return styles?.[key] ? styles[key](nextStyles, state) : nextStyles;
      },
    ]),
  ),
});

const Select = ({
  label,
  error,
  hint,
  size = "md",
  variant = "default",
  radius = "md",
  fullWidth = true,
  required = false,
  id,
  className = "",
  classNamePrefix = "select_rs",
  styles,
  onKeyDown,
  ...rest
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const hintId = hint && !error ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  const handleKeyDown = (event) => {
    onKeyDown?.(event);
    if (event.key === "Escape" && event.target.getAttribute?.("aria-expanded") === "true") {
      event.stopPropagation();
    }
  };

  const wrapperClasses = cx(
    "select",
    `select_${size}`,
    `select_variant_${variant}`,
    `select_radius_${radius}`,
    error ? "select_has_error" : "",
    fullWidth ? "select_full_width" : "",
    className,
  );

  return (
    <div className={wrapperClasses}>
      {label && (
        <label className="select_label" htmlFor={selectId}>
          {label}
          {required && <span className="select_required" aria-hidden="true">*</span>}
        </label>
      )}

      <ReactSelect
        inputId={selectId}
        classNamePrefix={classNamePrefix}
        unstyled
        components={selectComponents}
        onKeyDown={handleKeyDown}
        styles={mergeStyles(styles)}
        placeholder="Seçin..."
        noOptionsMessage={() => "Sonuç bulunamadı"}
        loadingMessage={() => "Yükleniyor..."}
        ariaLiveMessages={ariaLiveMessages}
        screenReaderStatus={screenReaderStatus}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        menuPlacement="auto"
        required={required}
        aria-required={required || undefined}
        aria-invalid={Boolean(error) || undefined}
        aria-errormessage={errorId}
        fieldDescribedBy={cx(hintId, errorId)}
        {...rest}
      />

      {hint && !error && (
        <span className="select_hint" id={hintId}>{hint}</span>
      )}

      {error && (
        <span className="select_error_message" id={errorId} role="alert">{error}</span>
      )}
    </div>
  );
};

export default Select;
