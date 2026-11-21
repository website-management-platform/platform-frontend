import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./errors";
import { sessionEvents } from "./sessionEvents";

const MAX_RETRIES = 2;

const shouldRetry = (failureCount, error) => {
  if (!(error instanceof ApiError)) return failureCount < MAX_RETRIES;
  if (error.status === 0 || error.status >= 500) return failureCount < MAX_RETRIES;
  return false;
};

const handleGlobalError = (error) => {
  if (!(error instanceof ApiError)) return;
  if (error.code === "UNAUTHENTICATED") sessionEvents.emit("unauthorized");
  else if (error.status === 403 && error.code === "PERMISSION_DENIED") sessionEvents.emit("forbidden");
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleGlobalError }),
  mutationCache: new MutationCache({ onError: handleGlobalError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});
