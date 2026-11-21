import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/http";
import { queryKeys } from "@/api/queryKeys";

// Sözleşme: docs/backend/02-tenancy.md
const keys = queryKeys.platform;

export const useSites = (params) => useQuery({
  queryKey: keys.sites(params),
  queryFn: ({ signal }) => {
    const { tenantId, ...query } = params;
    const path = tenantId ? `/platform/tenants/${tenantId}/sites` : "/platform/sites";
    return api.get(path, { query: { ...query, includeTotal: true }, signal });
  },
  placeholderData: keepPreviousData,
});

export const useSite = (siteId) => useQuery({
  queryKey: keys.site(siteId),
  queryFn: ({ signal }) => api.get(`/platform/sites/${siteId}`, { signal }),
});

const useInvalidateSites = () => {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["platform", "sites"] }),
    queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] }),
    queryClient.invalidateQueries({ queryKey: keys.overview() }),
  ]);
};

export const useCreateSite = () => {
  const invalidate = useInvalidateSites();
  return useMutation({
    mutationFn: ({ tenantId, values, idempotencyKey }) => api.post(`/platform/tenants/${tenantId}/sites`, values, { idempotencyKey }),
    onSuccess: invalidate,
  });
};

export const useUpdateSite = (siteId) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSites();
  return useMutation({
    mutationFn: ({ values, version }) => api.patch(`/platform/sites/${siteId}`, values, { ifMatch: version }),
    onSuccess: (site) => {
      queryClient.setQueryData(keys.site(siteId), site);
      return invalidate();
    },
  });
};

export const useSiteAction = (siteId) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSites();
  return useMutation({
    mutationFn: ({ action, reason, version }) => api.post(`/platform/sites/${siteId}/actions/${action}`, { reason: reason || null }, { ifMatch: version }),
    onSuccess: (site) => {
      queryClient.setQueryData(keys.site(siteId), site);
      return invalidate();
    },
  });
};

// Dil değişikliği (14-operations.md §8): önce etki raporu, sonra raporun belirteciyle uygulama.
export const useLocaleImpact = (siteId) => useMutation({
  mutationFn: (values) => api.post(`/platform/sites/${siteId}/locales/impact`, values),
});

export const useApplyLocales = (siteId) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSites();
  return useMutation({
    mutationFn: ({ values, version }) => api.put(`/platform/sites/${siteId}/locales`, values, { ifMatch: version }),
    onSuccess: (site) => {
      queryClient.setQueryData(keys.site(siteId), site);
      return invalidate();
    },
  });
};

// Site kopyalama (15-site-data.md §1): yapılandırma, isteğe bağlı içerik ve medya; kayıtlar taslak olarak kopyalanır.
export const useCloneSite = (siteId) => {
  const invalidate = useInvalidateSites();
  return useMutation({
    mutationFn: ({ values, idempotencyKey }) => api.post(`/platform/sites/${siteId}/actions/clone`, values, { idempotencyKey }),
    onSuccess: invalidate,
  });
};
