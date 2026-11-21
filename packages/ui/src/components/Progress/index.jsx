import { useId } from "react";
import { cx } from "@/utils/cx";
import "./progress.scss";

const CIRCLE_RADIUS = 18;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export const Progress = ({
  value = 0,
  max = 100,
  variant = "linear",
  status = "default",
  size = "md",
  indeterminate = false,
  showLabel = false,
  label,
  ariaLabel,
  striped = false,
  animated = false,
  segments = 0,
  className = "",
}) => {
  const labelId = useId();
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Math.min(safeMax, Math.max(0, Number.isFinite(value) ? value : 0));
  const percent = Math.min(100, Math.max(0, (safeValue / safeMax) * 100));

  if (variant === "circular") {
    const offset = CIRCLE_CIRCUMFERENCE - (percent / 100) * CIRCLE_CIRCUMFERENCE;

    return (
      <span
        className={cx("progress_circular", `progress_circular_${size}`, className)}
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={indeterminate ? undefined : safeValue}
        aria-valuemin={0}
        aria-valuemax={safeMax}
      >
        <svg viewBox="0 0 40 40" className={indeterminate ? "progress_circular_indeterminate" : ""}>
          <circle className="progress_circular_track" cx="20" cy="20" r={CIRCLE_RADIUS} />
          <circle
            className={`progress_circular_bar progress_circular_bar_${status}`}
            cx="20"
            cy="20"
            r={CIRCLE_RADIUS}
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={indeterminate ? CIRCLE_CIRCUMFERENCE * 0.75 : offset}
          />
        </svg>
        {showLabel && !indeterminate && (
          <span className="progress_circular_label">{Math.round(percent)}%</span>
        )}
      </span>
    );
  }

  return (
    <div className={cx("progress_linear_wrapper", className)}>
      {(label || showLabel) && (
        <div className="progress_linear_header">
          {label && <span className="progress_linear_label" id={labelId}>{label}</span>}
          {showLabel && !indeterminate && <span className="progress_linear_percent">{Math.round(percent)}%</span>}
        </div>
      )}
      <div
        className={cx("progress_linear", `progress_linear_${size}`, segments > 0 && "progress_linear_segmented")}
        role="progressbar"
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? labelId : undefined}
        aria-valuenow={indeterminate ? undefined : safeValue}
        aria-valuemin={0}
        aria-valuemax={safeMax}
      >
        {segments > 0 && !indeterminate ? (
          Array.from({ length: segments }, (_, index) => (
            <span
              key={index}
              className={cx(
                "progress_segment",
                (index + 1) / segments <= percent / 100 + 0.0001 && `progress_segment_filled progress_segment_${status}`,
              )}
            />
          ))
        ) : (
          <div
            className={cx(
              "progress_linear_bar",
              `progress_linear_bar_${status}`,
              indeterminate && "progress_linear_bar_indeterminate",
              striped && "progress_linear_bar_striped",
              striped && animated && "progress_linear_bar_animated",
            )}
            style={indeterminate ? undefined : { width: `${percent}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default Progress;
