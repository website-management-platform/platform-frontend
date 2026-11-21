import { cx } from "@/utils/cx";
import "./button_group.scss";

const ButtonGroup = ({ attached = true, ariaLabel, className = "", children }) => (
  <div
    className={cx(attached ? "button_group" : "button_group_spaced", className)}
    role="group"
    aria-label={ariaLabel}
  >
    {children}
  </div>
);

export default ButtonGroup;
