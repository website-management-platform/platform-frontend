import { useState } from "react";
import { FiUser } from "react-icons/fi";
import { cx } from "@/utils/cx";
import "./avatar.scss";

const STATUS_LABELS = {
  online: "Çevrimiçi",
  offline: "Çevrimdışı",
  busy: "Meşgul",
  away: "Uzakta",
};

const TONES = ["accent", "success", "warning", "danger", "neutral"];

const getInitials = (name) => (
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase("tr-TR"))
    .join("")
);

const getTone = (name) => {
  const hash = Array.from(name).reduce((total, character) => total + character.codePointAt(0), 0);
  return TONES[hash % TONES.length];
};

const Avatar = ({
  src,
  name,
  alt,
  initials,
  size = "md",
  status,
  shape = "circle",
  tone,
  ring = false,
  className = "",
}) => {
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = Boolean(src) && failedSrc !== src;
  const resolvedInitials = initials ?? (name ? getInitials(name) : "");
  const resolvedTone = tone ?? (name ? getTone(name) : null);
  const accessibleName = [alt ?? name, STATUS_LABELS[status]].filter(Boolean).join(", ");

  const classes = cx(
    "avatar",
    `avatar_${size}`,
    `avatar_${shape}`,
    resolvedTone && `avatar_tone_${resolvedTone}`,
    ring && "avatar_ring",
    className,
  );

  return (
    <span
      className={classes}
      role={accessibleName ? "img" : undefined}
      aria-label={accessibleName || undefined}
      aria-hidden={accessibleName ? undefined : "true"}
    >
      <span className="avatar_inner">
        {showImage ? (
          <img className="avatar_image" src={src} alt="" onError={() => setFailedSrc(src)} />
        ) : resolvedInitials ? (
          <span className="avatar_initials">{resolvedInitials}</span>
        ) : (
          <FiUser className="avatar_fallback_icon" aria-hidden="true" />
        )}
      </span>
      {status && <span className={`avatar_status avatar_status_${status}`} />}
    </span>
  );
};

export default Avatar;
