import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/api/http";
import { queryKeys } from "@/api/queryKeys";

// Sözleşme: docs/backend/04-audit.md
export const useAuditEvents = (params) => useQuery({
  queryKey: queryKeys.platform.audit(params),
  queryFn: ({ signal }) => api.get("/platform/audit", { query: { ...params, includeTotal: true }, signal }),
  placeholderData: keepPreviousData,
});
