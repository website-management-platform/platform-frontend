import { useEffect, useRef, useState } from "react";
import { cx } from "@/utils/cx";
import "./table.scss";

const OVERFLOW_TOLERANCE = 1;

const Table = ({
  variant = "flush",
  hoverable = false,
  caption,
  hideCaption = false,
  ariaLabel,
  className = "",
  wrapperClassName = "",
  children,
}) => {
  const wrapperRef = useRef(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    const observer = new ResizeObserver(() => {
      setScrollable(wrapper.scrollWidth > wrapper.clientWidth + OVERFLOW_TOLERANCE);
    });
    observer.observe(wrapper);
    if (wrapper.firstElementChild) observer.observe(wrapper.firstElementChild);
    return () => observer.disconnect();
  }, []);

  const regionLabel = ariaLabel ?? (typeof caption === "string" ? caption : undefined);

  return (
    <div
      ref={wrapperRef}
      className={cx("table_wrapper", `table_wrapper_${variant}`, wrapperClassName)}
      role={scrollable ? "region" : undefined}
      aria-label={scrollable ? regionLabel : undefined}
      tabIndex={scrollable ? 0 : undefined}
    >
      <table
        className={cx("table", `table_${variant}`, hoverable && "table_hoverable", className)}
        aria-label={caption ? undefined : ariaLabel}
      >
        {caption && <caption className={cx("table_caption", hideCaption && "visually_hidden")}>{caption}</caption>}
        {children}
      </table>
    </div>
  );
};

export default Table;
