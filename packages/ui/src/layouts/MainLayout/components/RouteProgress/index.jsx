import { useEffect, useState } from "react";
import { cx } from "@/utils/cx";
import "./route_progress.scss";

const SHOW_DELAY = 120;

const RouteProgress = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cx("route_progress", visible && "route_progress_visible")}
      role="progressbar"
      aria-label="Sayfa yükleniyor"
    >
      <span className="route_progress_bar" />
    </div>
  );
};

export default RouteProgress;
