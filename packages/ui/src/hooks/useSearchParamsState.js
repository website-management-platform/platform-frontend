import { useCallback, useState } from "react";
import { useLocation, useNavigationType, useSearchParams } from "react-router";

const isDefaultValue = (value, defaultValue) => (
  value === undefined || value === null || value === "" || String(value) === String(defaultValue)
);

export const useSearchParamsState = (defaults) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = Object.fromEntries(
    Object.entries(defaults).map(([key, defaultValue]) => [key, searchParams.get(key) ?? String(defaultValue)]),
  );

  const setValues = useCallback((updates, options) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      Object.entries(updates).forEach(([key, value]) => {
        if (isDefaultValue(value, defaults[key])) next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    }, options);
  }, [defaults, setSearchParams]);

  return [values, setValues];
};

export const useUrlSyncedValue = (urlValue) => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [value, setValue] = useState(urlValue);
  const [locationKey, setLocationKey] = useState(location.key);

  if (location.key !== locationKey) {
    setLocationKey(location.key);
    if (navigationType !== "REPLACE") setValue(urlValue);
  }

  return [value, setValue];
};
