import { useEffect } from "react";

let lockCount = 0;
let restoreStyles = null;

const lockScroll = () => {
  if (lockCount === 0) {
    const { body, documentElement } = document;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    restoreStyles = {
      overflow: body.style.overflow,
      paddingInlineEnd: body.style.paddingInlineEnd,
    };
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingInlineEnd = `${scrollbarWidth}px`;
  }
  lockCount += 1;
};

const unlockScroll = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || !restoreStyles) return;
  document.body.style.overflow = restoreStyles.overflow;
  document.body.style.paddingInlineEnd = restoreStyles.paddingInlineEnd;
  restoreStyles = null;
};

export const useScrollLock = (locked) => {
  useEffect(() => {
    if (!locked) return undefined;
    lockScroll();
    return unlockScroll;
  }, [locked]);
};
