import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/http";
import { queryKeys } from "@/api/queryKeys";

// Sözleşme: docs/backend/05-schema.md §8–§10 (site modülleri, şema yaşam döngüsü, preset uygulama)
const keys = queryKeys.platform;
const base = (siteId, instanceId) => `/platform/sites/${siteId}/modules${instanceId ? `/${instanceId}` : ""}`;

export const useSiteModules = (siteId) => useQuery({
  queryKey: keys.siteModules(siteId),
  queryFn: ({ signal }) => api.get(base(siteId), { signal }),
  enabled: Boolean(siteId),
});

export const useSiteModule = (siteId, instanceId) => useQuery({
  queryKey: keys.siteModule(siteId, instanceId),
  queryFn: ({ signal }) => api.get(base(siteId, instanceId), { signal }),
  enabled: Boolean(siteId && instanceId),
});

export const useSchemaVersions = (siteId, instanceId) => useQuery({
  queryKey: keys.schemaVersions(siteId, instanceId),
  queryFn: ({ signal }) => api.get(`${base(siteId, instanceId)}/schema/versions`, { signal }),
  enabled: Boolean(siteId && instanceId),
});

const useInvalidateSiteModules = (siteId) => {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.siteModules(siteId) }),
    queryClient.invalidateQueries({ queryKey: keys.site(siteId), exact: true }),
    queryClient.invalidateQueries({ queryKey: ["platform", "library"] }),
  ]);
};

export const useAssignModule = (siteId) => {
  const invalidate = useInvalidateSiteModules(siteId);
  return useMutation({
    mutationFn: ({ values, idempotencyKey }) => api.post(base(siteId), values, { idempotencyKey }),
    onSuccess: invalidate,
  });
};

export const useApplyPreset = (siteId) => {
  const invalidate = useInvalidateSiteModules(siteId);
  return useMutation({
    mutationFn: ({ values, idempotencyKey }) => api.post(`/platform/sites/${siteId}/presets/apply`, values, { idempotencyKey }),
    onSuccess: invalidate,
  });
};

// Taslak otomatik kaydı: yalnız modül detayı güncellenir.
export const useUpdateModule = (siteId, instanceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ values, version }) => api.patch(base(siteId, instanceId), values, { ifMatch: version }),
    onSuccess: (instance) => queryClient.setQueryData(keys.siteModule(siteId, instanceId), instance),
  });
};

const useModuleMutation = (siteId, instanceId, request) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSiteModules(siteId);
  return useMutation({
    mutationFn: request,
    onSuccess: (instance, variables) => {
      if (variables?.action !== "clone") queryClient.setQueryData(keys.siteModule(siteId, instanceId), instance);
      return Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: keys.schemaVersions(siteId, instanceId) })]);
    },
  });
};

export const useModuleAction = (siteId, instanceId) => useModuleMutation(siteId, instanceId, ({ action, values = {}, version, idempotencyKey }) => (
  api.post(`${base(siteId, instanceId)}/actions/${action}`, values, action === "clone" ? { idempotencyKey } : { ifMatch: version })
));

export const usePublishSchema = (siteId, instanceId) => useModuleMutation(siteId, instanceId, ({ values, version }) => api.post(`${base(siteId, instanceId)}/schema/publish`, values, { ifMatch: version }));

export const useRollbackSchema = (siteId, instanceId) => useModuleMutation(siteId, instanceId, ({ toVersion, version }) => api.post(`${base(siteId, instanceId)}/schema/rollback`, { toVersion }, { ifMatch: version }));

// Yan etkisiz hesaplamalar (fark, dry-run) POST'tur ama önbelleğe yazılmaz.
export const useSchemaDryRun = (siteId, instanceId) => useMutation({
  mutationFn: ({ plan }) => api.post(`${base(siteId, instanceId)}/schema/dry-run`, { plan }),
});
