import { Children, cloneElement, isValidElement } from "react";
import { cx } from "@/utils/cx";
import "./avatar_group.scss";

const AvatarGroup = ({ max, size = "md", label, className = "", children }) => {
  const avatars = Children.toArray(children).filter(isValidElement);
  const visibleAvatars = max ? avatars.slice(0, max) : avatars;
  const overflowCount = avatars.length - visibleAvatars.length;

  return (
    <div className={cx("avatar_group", `avatar_group_${size}`, className)} role="group" aria-label={label}>
      {visibleAvatars.map((avatar) => cloneElement(avatar, { size }))}
      {overflowCount > 0 && (
        <span
          className={cx("avatar", `avatar_${size}`, "avatar_circle", "avatar_tone_neutral", "avatar_group_overflow")}
          role="img"
          aria-label={`${overflowCount} kişi daha`}
        >
          <span className="avatar_inner">
            <span className="avatar_initials">+{overflowCount}</span>
          </span>
        </span>
      )}
    </div>
  );
};

export default AvatarGroup;
