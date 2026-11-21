import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/http";
import { queryKeys } from "@/api/queryKeys";

// Sözleşme: docs/backend/02-tenancy.md (müşteri ve hesabı), 03-access-control.md
const keys = queryKeys.platform;

export const useTenants = (params) => useQuery({
  queryKey: keys.tenants(params),
  queryFn: ({ signal }) => api.get("/platform/tenants", { query: { ...params, includeTotal: true }, signal }),
  placeholderData: keepPreviousData,
});

export const useTenant = (tenantId) => useQuery({
  queryKey: keys.tenant(tenantId),
  queryFn: ({ signal }) => api.get(`/platform/tenants/${tenantId}`, { signal }),
  enabled: Boolean(tenantId),
});

const useInvalidateTenants = () => {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] }),
    queryClient.invalidateQueries({ queryKey: keys.overview() }),
  ]);
};

export const useCreateTenant = () => {
  const invalidate = useInvalidateTenants();
  return useMutation({
    mutationFn: ({ values, idempotencyKey }) => api.post("/platform/tenants", values, { idempotencyKey }),
    onSuccess: invalidate,
  });
};

export const useUpdateTenant = (tenantId) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTenants();
  return useMutation({
    mutationFn: ({ values, version }) => api.patch(`/platform/tenants/${tenantId}`, values, { ifMatch: version }),
    onSuccess: (tenant) => {
      queryClient.setQueryData(keys.tenant(tenantId), tenant);
      return invalidate();
    },
  });
};

export const useTenantAction = (tenantId) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTenants();
  return useMutation({
    mutationFn: ({ action, reason, version }) => api.post(`/platform/tenants/${tenantId}/actions/${action}`, { reason: reason || null }, { ifMatch: version }),
    onSuccess: (tenant) => {
      queryClient.setQueryData(keys.tenant(tenantId), tenant);
      return Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: ["platform", "sites"] })]);
    },
  });
};

// Müşteri hesabı (ADR-056): her müşterinin tek hesabı vardır; hesap tenant yanıtında `account` olarak gelir.
export const useUpdateAccount = (tenantId) => {
  const invalidate = useInvalidateTenants();
  return useMutation({
    mutationFn: (values) => api.put(`/platform/tenants/${tenantId}/account`, values),
    onSuccess: invalidate,
  });
};

export const useSendSetupLink = (tenantId) => useMutation({
  mutationFn: () => api.post(`/platform/tenants/${tenantId}/account/actions/send-setup-link`, {}),
});

// Kalıcı silme (15-site-data.md §3).
export const useTenantDataAction = (tenantId) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTenants();
  return useMutation({
    mutationFn: ({ action, body, version }) => api.post(`/platform/tenants/${tenantId}/actions/${action}`, body, { ifMatch: version }),
    onSuccess: (tenant) => {
      queryClient.setQueryData(keys.tenant(tenantId), tenant);
      return Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: ["platform", "sites"] })]);
    },
  });
};
