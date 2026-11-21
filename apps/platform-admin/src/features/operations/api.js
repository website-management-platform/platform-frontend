import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/http";
import { queryKeys } from "@/api/queryKeys";

// Sözleşme: docs/backend/14-operations.md §6–§7 (iş kuyruğu, sağlık özeti)
const keys = queryKeys.platform;

export const useHealthSummary = () => useQuery({
  queryKey: keys.healthSummary(),
  queryFn: ({ signal }) => api.get("/platform/health-summary", { signal }),
  refetchInterval: 30_000,
});

export const useJobs = (params) => useQuery({
  queryKey: keys.jobs(params),
  queryFn: ({ signal }) => api.get("/platform/jobs", { query: params, signal }),
  placeholderData: keepPreviousData,
  refetchInterval: 15_000,
});

export const useRetryJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId) => api.post(`/platform/jobs/${jobId}/retry`, {}),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["platform", "jobs"] }),
      queryClient.invalidateQueries({ queryKey: keys.healthSummary() }),
    ]),
  });
};
