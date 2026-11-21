import { cx } from "@/utils/cx";
import "./timeline.scss";

const Timeline = ({ items, variant = "default", className = "" }) => (
  <ol className={cx("timeline", `timeline_${variant}`, className)}>
    {items.map((item) => {
      const Icon = item.icon;
      return (
        <li key={item.id ?? item.title} className={cx("timeline_item", `timeline_tone_${item.tone ?? "neutral"}`)}>
          <span className={cx("timeline_marker", Icon && "timeline_marker_icon")} aria-hidden="true">
            {Icon && <Icon />}
          </span>
          <div className="timeline_content">
            <div className="timeline_header">
              <span className="timeline_title">{item.title}</span>
              {item.time && <time className="timeline_time" dateTime={item.dateTime}>{item.time}</time>}
            </div>
            {item.description && <div className="timeline_description">{item.description}</div>}
          </div>
        </li>
      );
    })}
  </ol>
);

export default Timeline;
