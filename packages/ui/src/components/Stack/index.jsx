import { cx } from "@/utils/cx";
import "./stack.scss";

const Stack = ({
  as: Component = "div",
  direction = "vertical",
  gap = 4,
  align,
  justify,
  wrap = false,
  className = "",
  children,
  ...rest
}) => {
  const classes = cx(
    "stack",
    `stack_${direction}`,
    `stack_gap_${gap}`,
    align && `stack_align_${align}`,
    justify && `stack_justify_${justify}`,
    wrap && "stack_wrap",
    className,
  );

  return <Component className={classes} {...rest}>{children}</Component>;
};

export default Stack;
