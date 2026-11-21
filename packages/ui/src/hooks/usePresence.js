import { useEffect, useState } from "react";
import { readDuration } from "@/utils/motion";

export const usePresence = (open, durationToken = "--app-duration-base") => {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      let innerFrame;
      const outerFrame = requestAnimationFrame(() => {
        innerFrame = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(outerFrame);
        cancelAnimationFrame(innerFrame);
      };
    }

    if (!mounted) return undefined;

    const timer = setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, readDuration(durationToken));
    return () => clearTimeout(timer);
  }, [open, mounted, durationToken]);

  return { mounted, visible: open && entered };
};
