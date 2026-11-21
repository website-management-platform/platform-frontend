import { cx } from "@/utils/cx";
import "./spinner.scss";

const INDICATOR_PARTS = { dots: 3, bars: 4 };

const Spinner = ({
  size = "md",
  variant = "ring",
  tone = "muted",
  label,
  centered = false,
  overlay = false,
  decorative = false,
  className = "",
}) => {
  const classes = cx(
    "spinner_wrapper",
    `spinner_tone_${tone}`,
    centered && "spinner_wrapper_centered",
    overlay && "spinner_wrapper_overlay",
    className,
  );
  const partCount = INDICATOR_PARTS[variant] ?? 0;

  return (
    <span className={classes} role={decorative ? undefined : "status"} aria-hidden={decorative || undefined}>
      <span className={cx("spinner", `spinner_${variant}`, `spinner_${size}`)} aria-hidden="true">
        {Array.from({ length: partCount }, (_, index) => (
          <span key={index} className="spinner_part" />
        ))}
      </span>
      {label && <span className="spinner_label">{label}</span>}
      {!label && !decorative && <span className="visually_hidden">Yükleniyor</span>}
    </span>
  );
};

export default Spinner;
