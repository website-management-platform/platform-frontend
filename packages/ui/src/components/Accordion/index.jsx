import { createContext, useContext, useId, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { cx } from "@/utils/cx";
import "./accordion.scss";

const AccordionContext = createContext(null);

const isOpenValue = (openValues, value) => openValues.includes(value);

export const Accordion = ({
  type = "single",
  value,
  defaultValue,
  onValueChange,
  collapsible = true,
  bordered = true,
  variant,
  className = "",
  children,
}) => {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => {
    if (defaultValue !== undefined) return defaultValue;
    return type === "multiple" ? [] : null;
  });

  const rawValue = isControlled ? value : internalValue;
  const openValues = type === "multiple" ? (rawValue || []) : (rawValue ? [rawValue] : []);

  const toggle = (itemValue) => {
    let next;
    if (type === "multiple") {
      next = isOpenValue(openValues, itemValue)
        ? openValues.filter((item) => item !== itemValue)
        : [...openValues, itemValue];
    } else {
      const isOpen = openValues[0] === itemValue;
      next = isOpen ? (collapsible ? null : itemValue) : itemValue;
    }

    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  };

  const resolvedVariant = variant ?? (bordered ? "contained" : "plain");
  const classes = cx("accordion", `accordion_${resolvedVariant}`, className);

  return (
    <AccordionContext.Provider value={{ openValues, toggle }}>
      <div className={classes}>{children}</div>
    </AccordionContext.Provider>
  );
};

export const AccordionItem = ({ value, title, headingLevel = 3, icon: Icon, badge, disabled = false, children }) => {
  const context = useContext(AccordionContext);
  if (!context) throw new Error("AccordionItem must be used within Accordion");

  const { openValues, toggle } = context;
  const open = isOpenValue(openValues, value);
  const contentId = useId();
  const triggerId = useId();
  const Heading = `h${headingLevel}`;

  return (
    <div className={cx("accordion_item", open && "accordion_item_open", disabled && "accordion_item_disabled")}>
      <Heading className="accordion_heading">
        <button
          type="button"
          id={triggerId}
          className={`accordion_trigger ${open ? "accordion_trigger_open" : ""}`}
          onClick={() => !disabled && toggle(value)}
          disabled={disabled}
          aria-expanded={open}
          aria-controls={contentId}
        >
          {Icon && <Icon className="accordion_trigger_icon" aria-hidden="true" />}
          <span className="accordion_trigger_title">{title}</span>
          {badge !== undefined && <span className="accordion_badge">{badge}</span>}
          <FiChevronDown className={`accordion_chevron ${open ? "accordion_chevron_open" : ""}`} aria-hidden="true" />
        </button>
      </Heading>
      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        className="accordion_content"
        hidden={!open}
      >
        <div className="accordion_content_inner">{children}</div>
      </div>
    </div>
  );
};

export default Accordion;
