import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/http";
import { queryKeys } from "@/api/queryKeys";

// Sözleşme: docs/backend/12-integrations.md
const keys = queryKeys.platform;
const base = (siteId) => `/platform/sites/${siteId}`;

// Entegrasyondaki her değişiklik sekmedeki sayaçları ve site ayrıntısını (birincil alan adı) etkiler.
const useInvalidate = (siteId) => {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.siteIntegration(siteId) }),
    queryClient.invalidateQueries({ queryKey: keys.site(siteId) }),
  ]);
};

const useSiteMutation = (siteId, mutationFn) => {
  const invalidate = useInvalidate(siteId);
  return useMutation({ mutationFn, onSuccess: invalidate });
};

export const useIntegration = (siteId) => useQuery({
  queryKey: keys.siteIntegration(siteId),
  queryFn: ({ signal }) => api.get(`${base(siteId)}/integration`, { signal }),
});

export const useUpdateIntegration = (siteId) => useSiteMutation(siteId, ({ values, version }) => api.patch(`${base(siteId)}/integration`, values, { ifMatch: version }));

export const useDomains = (siteId) => useQuery({
  queryKey: keys.siteDomains(siteId),
  queryFn: ({ signal }) => api.get(`${base(siteId)}/domains`, { signal }),
});

export const useAddDomain = (siteId) => useSiteMutation(siteId, ({ hostname, idempotencyKey }) => api.post(`${base(siteId)}/domains`, { hostname }, { idempotencyKey }));
export const useVerifyDomain = (siteId) => useSiteMutation(siteId, (domainId) => api.post(`${base(siteId)}/domains/${domainId}/verify`, {}));
export const useMakePrimaryDomain = (siteId) => useSiteMutation(siteId, (domainId) => api.patch(`${base(siteId)}/domains/${domainId}`, { isPrimary: true }));
export const useRemoveDomain = (siteId) => useSiteMutation(siteId, (domainId) => api.delete(`${base(siteId)}/domains/${domainId}`));

export const useCredentials = (siteId) => useQuery({
  queryKey: keys.siteCredentials(siteId),
  queryFn: ({ signal }) => api.get(`${base(siteId)}/credentials`, { signal }),
});

export const useCreateCredential = (siteId) => useSiteMutation(siteId, ({ values, idempotencyKey }) => api.post(`${base(siteId)}/credentials`, values, { idempotencyKey }));
export const useCredentialAction = (siteId) => useSiteMutation(siteId, ({ credentialId, action }) => api.post(`${base(siteId)}/credentials/${credentialId}/${action}`, {}));

export const useWebhooks = (siteId) => useQuery({
  queryKey: keys.siteWebhooks(siteId),
  queryFn: ({ signal }) => api.get(`${base(siteId)}/webhooks`, { signal }),
});

export const useCreateWebhook = (siteId) => useSiteMutation(siteId, ({ values, idempotencyKey }) => api.post(`${base(siteId)}/webhooks`, values, { idempotencyKey }));
export const useUpdateWebhook = (siteId) => useSiteMutation(siteId, ({ webhookId, values, version }) => api.patch(`${base(siteId)}/webhooks/${webhookId}`, values, { ifMatch: version }));
export const useDeleteWebhook = (siteId) => useSiteMutation(siteId, (webhookId) => api.delete(`${base(siteId)}/webhooks/${webhookId}`));
export const useWebhookAction = (siteId) => useSiteMutation(siteId, ({ webhookId, action }) => api.post(`${base(siteId)}/webhooks/${webhookId}/${action}`, {}));

// Teslim geçmişi kuyruk işlendikçe değişir; açıkken birkaç saniyede bir yenilenir.
export const useWebhookDeliveries = (siteId, webhookId) => useQuery({
  queryKey: keys.webhookDeliveries(siteId, webhookId),
  queryFn: ({ signal }) => api.get(`${base(siteId)}/webhooks/${webhookId}/deliveries`, { signal }),
  enabled: Boolean(webhookId),
  refetchInterval: 5000,
});

export const useRetryDelivery = (siteId, webhookId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId) => api.post(`${base(siteId)}/webhooks/${webhookId}/deliveries/${deliveryId}/retry`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.webhookDeliveries(siteId, webhookId) }),
  });
};

export const useManifests = (siteId) => useQuery({
  queryKey: keys.siteManifests(siteId),
  queryFn: ({ signal }) => api.get(`${base(siteId)}/manifests`, { signal }),
});

export const useManifest = (siteId, manifestId) => useQuery({
  queryKey: keys.siteManifest(siteId, manifestId),
  queryFn: ({ signal }) => api.get(`${base(siteId)}/manifests/${manifestId}`, { signal }),
  enabled: Boolean(manifestId),
});

export const useRegisterManifest = (siteId) => useSiteMutation(siteId, (manifest) => api.post(`${base(siteId)}/manifests`, { manifest }));
export const useActivateManifest = (siteId) => useSiteMutation(siteId, (manifestId) => api.post(`${base(siteId)}/manifests/${manifestId}/activate`, {}));
