import { cx } from "@/utils/cx";
import "./skeleton.scss";

const Skeleton = ({
  variant = "text",
  width,
  height,
  lines = 1,
  animation = "shimmer",
  radius,
  className = "",
  style,
}) => {
  const classes = cx(
    "skeleton",
    `skeleton_${variant}`,
    `skeleton_animation_${animation}`,
    radius && `skeleton_radius_${radius}`,
    className,
  );

  if (variant === "text" && lines > 1) {
    return (
      <span className="skeleton_lines" aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className={classes}
            style={{ width: index === lines - 1 ? "60%" : width, height, ...style }}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      className={classes}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
};

export const SkeletonCard = ({ className = "" }) => (
  <div className={cx("skeleton_preset", "skeleton_preset_card", className)} aria-hidden="true">
    <Skeleton variant="rectangle" height={140} />
    <Skeleton width="45%" />
    <Skeleton lines={3} />
  </div>
);

export const SkeletonList = ({ items = 3, className = "" }) => (
  <div className={cx("skeleton_preset", "skeleton_preset_list", className)} aria-hidden="true">
    {Array.from({ length: items }, (_, index) => (
      <div key={index} className="skeleton_preset_row">
        <Skeleton variant="circle" />
        <div className="skeleton_preset_content">
          <Skeleton width="40%" />
          <Skeleton width="75%" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, columns = 4, className = "" }) => (
  <div
    className={cx("skeleton_preset_table", className)}
    style={{ "--skeleton-table-columns": columns }}
    aria-hidden="true"
  >
    {Array.from({ length: rows + 1 }, (_, rowIndex) => (
      <div key={rowIndex} className={cx("skeleton_preset_table_row", rowIndex === 0 && "skeleton_preset_table_head")}>
        {Array.from({ length: columns }, (_, columnIndex) => (
          <Skeleton key={columnIndex} width={rowIndex === 0 ? "50%" : "80%"} />
        ))}
      </div>
    ))}
  </div>
);

export default Skeleton;
