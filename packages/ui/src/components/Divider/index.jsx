import { cx } from "@/utils/cx";
import "./divider.scss";

const Divider = ({
  orientation = "horizontal",
  label,
  dashed = false,
  className = "",
}) => {
  if (orientation === "vertical") {
    return <span className={cx("divider_vertical", className)} role="separator" aria-orientation="vertical" />;
  }

  if (label) {
    return (
      <div
        className={cx("divider_with_label", className)}
        role="separator"
        aria-label={typeof label === "string" ? label : undefined}
      >
        <span className={`divider_line ${dashed ? "divider_dashed" : ""}`} />
        <span className="divider_label" aria-hidden="true">{label}</span>
        <span className={`divider_line ${dashed ? "divider_dashed" : ""}`} />
      </div>
    );
  }

  const classes = cx(
    "divider_horizontal",
    dashed ? "divider_dashed" : "",
    className,
  );

  return <hr className={classes} />;
};

export default Divider;
