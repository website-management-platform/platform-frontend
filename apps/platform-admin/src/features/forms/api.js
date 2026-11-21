import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/http";
import { queryKeys } from "@/api/queryKeys";

// Sözleşme: docs/backend/13-forms.md §2 (platform form tanımları)
const keys = queryKeys.platform;
const base = (siteId) => `/platform/sites/${siteId}/forms`;

export const useSiteForms = (siteId) => useQuery({
  queryKey: keys.siteForms(siteId),
  queryFn: ({ signal }) => api.get(base(siteId), { signal }),
});

export const useSiteForm = (siteId, formId) => useQuery({
  queryKey: keys.siteForm(siteId, formId),
  queryFn: ({ signal }) => api.get(`${base(siteId)}/${formId}`, { signal }),
  enabled: Boolean(formId),
});

const useFormMutation = (siteId, mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (form) => {
      if (form?.id) queryClient.setQueryData(keys.siteForm(siteId, form.id), form);
      return queryClient.invalidateQueries({ queryKey: keys.siteForms(siteId), exact: true });
    },
  });
};

export const useCreateForm = (siteId) => useFormMutation(siteId, ({ values, idempotencyKey }) => api.post(base(siteId), values, { idempotencyKey }));
export const useUpdateForm = (siteId, formId) => useFormMutation(siteId, ({ values, version }) => api.patch(`${base(siteId)}/${formId}`, values, { ifMatch: version }));
export const usePublishForm = (siteId, formId) => useFormMutation(siteId, ({ version }) => api.post(`${base(siteId)}/${formId}/actions/publish`, {}, { ifMatch: version }));
