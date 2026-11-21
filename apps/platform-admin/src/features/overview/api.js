import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/http";
import { queryKeys } from "@/api/queryKeys";

export const useOverview = () => useQuery({
  queryKey: queryKeys.platform.overview(),
  queryFn: ({ signal }) => api.get("/platform/overview", { signal }),
});
