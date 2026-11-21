import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

export const useConsumedSearchParam = (name) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [value] = useState(() => searchParams.get(name));

  useEffect(() => {
    if (!searchParams.has(name)) return;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete(name);
      return next;
    }, { replace: true });
  }, [name, searchParams, setSearchParams]);

  return value;
};
