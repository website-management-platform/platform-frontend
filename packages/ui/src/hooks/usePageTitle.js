import { useEffect, useLayoutEffect } from "react";
import { APP_NAME } from "@/config/app.config";

const applyTitle = (title) => {
  if (!title) return;
  document.title = `${title} · ${APP_NAME}`;
};

export const usePageTitle = (title) => {
  useEffect(() => {
    applyTitle(title);
  }, [title]);
};

export const useRouteTitle = (title) => {
  useLayoutEffect(() => {
    applyTitle(title);
  }, [title]);
};
