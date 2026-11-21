import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/http";
import { queryKeys } from "@/api/queryKeys";

// Sözleşme: docs/backend/05-schema.md §4–§7 (alan registry'si, alan grupları, şablonlar, presetler)
const keys = queryKeys.platform;

const useInvalidateLibrary = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["platform", "library"] });
};

// Alan registry'si kod sürümüyle değişir; oturum boyunca yeniden çekilmez.
export const useFieldTypes = () => useQuery({
  queryKey: keys.fieldTypes(),
  queryFn: ({ signal }) => api.get("/platform/field-types", { signal }),
  staleTime: Infinity,
});

export const useFieldGroups = (params = {}) => useQuery({
  queryKey: keys.fieldGroups(params),
  queryFn: ({ signal }) => api.get("/platform/field-groups", { query: params, signal }),
});

export const useFieldGroup = (groupId) => useQuery({
  queryKey: keys.fieldGroup(groupId),
  queryFn: ({ signal }) => api.get(`/platform/field-groups/${groupId}`, { signal }),
  enabled: Boolean(groupId),
});

export const useCreateFieldGroup = () => {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ values, idempotencyKey }) => api.post("/platform/field-groups", values, { idempotencyKey }),
    onSuccess: invalidate,
  });
};

export const useUpdateFieldGroup = (groupId) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ values, version }) => api.patch(`/platform/field-groups/${groupId}`, values, { ifMatch: version }),
    onSuccess: (group) => {
      queryClient.setQueryData(keys.fieldGroup(groupId), group);
      return invalidate();
    },
  });
};

export const useFieldGroupAction = (groupId) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ action, version }) => api.post(`/platform/field-groups/${groupId}/actions/${action}`, {}, { ifMatch: version }),
    onSuccess: (group) => {
      queryClient.setQueryData(keys.fieldGroup(groupId), group);
      return invalidate();
    },
  });
};

export const useTemplates = (params = {}) => useQuery({
  queryKey: keys.templates(params),
  queryFn: ({ signal }) => api.get("/platform/templates", { query: { size: 100, ...params }, signal }),
  placeholderData: keepPreviousData,
});

export const useTemplate = (templateId) => useQuery({
  queryKey: keys.template(templateId),
  queryFn: ({ signal }) => api.get(`/platform/templates/${templateId}`, { signal }),
  enabled: Boolean(templateId),
});

export const useTemplateVersions = (templateId) => useQuery({
  queryKey: keys.templateVersions(templateId),
  queryFn: ({ signal }) => api.get(`/platform/templates/${templateId}/versions`, { signal }),
  enabled: Boolean(templateId),
});

// Yayınlanmış sürümler değişmez; bir kez çekilen sürüm yeniden çekilmez.
export const useTemplateVersion = (templateId, version) => useQuery({
  queryKey: keys.templateVersion(templateId, version),
  queryFn: ({ signal }) => api.get(`/platform/templates/${templateId}/versions/${version}`, { signal }),
  enabled: Boolean(templateId && version),
  staleTime: Infinity,
});

export const useTemplateUsages = (templateId) => useQuery({
  queryKey: keys.templateUsages(templateId),
  queryFn: ({ signal }) => api.get(`/platform/templates/${templateId}/usages`, { signal }),
  enabled: Boolean(templateId),
});

export const useCreateTemplate = () => {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ values, idempotencyKey }) => api.post("/platform/templates", values, { idempotencyKey }),
    onSuccess: invalidate,
  });
};

// Taslak kaydı (otomatik kayıt) listeyi geçersiz kılmaz; yalnız detay önbelleği güncellenir.
export const useUpdateTemplate = (templateId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ values, version }) => api.patch(`/platform/templates/${templateId}`, values, { ifMatch: version }),
    onSuccess: (template) => queryClient.setQueryData(keys.template(templateId), template),
  });
};

export const usePublishTemplateVersion = (templateId) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ changelog, version }) => api.post(`/platform/templates/${templateId}/versions`, { changelog: changelog || null }, { ifMatch: version }),
    onSuccess: (template) => {
      queryClient.setQueryData(keys.template(templateId), template);
      return invalidate();
    },
  });
};

export const useTemplateAction = (templateId) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ action, values = {}, version, idempotencyKey }) => api.post(`/platform/templates/${templateId}/actions/${action}`, values, action === "clone" ? { idempotencyKey } : { ifMatch: version }),
    onSuccess: (template, { action }) => {
      if (action !== "clone") queryClient.setQueryData(keys.template(templateId), template);
      return invalidate();
    },
  });
};

export const usePresets = (params = {}) => useQuery({
  queryKey: keys.presets(params),
  queryFn: ({ signal }) => api.get("/platform/presets", { query: params, signal }),
  placeholderData: keepPreviousData,
});

export const usePreset = (presetId) => useQuery({
  queryKey: keys.preset(presetId),
  queryFn: ({ signal }) => api.get(`/platform/presets/${presetId}`, { signal }),
  enabled: Boolean(presetId),
});

export const useCreatePreset = () => {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ values, idempotencyKey }) => api.post("/platform/presets", values, { idempotencyKey }),
    onSuccess: invalidate,
  });
};

const usePresetMutation = (presetId, request) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: request,
    onSuccess: (preset, variables) => {
      if (variables?.action !== "clone") queryClient.setQueryData(keys.preset(presetId), preset);
      return invalidate();
    },
  });
};

export const useUpdatePreset = (presetId) => usePresetMutation(presetId, ({ values, version }) => api.patch(`/platform/presets/${presetId}`, values, { ifMatch: version }));

export const useCreatePresetVersion = (presetId) => usePresetMutation(presetId, ({ modules, changelog, version }) => api.post(`/platform/presets/${presetId}/versions`, { modules, changelog: changelog || null }, { ifMatch: version }));

export const usePresetAction = (presetId) => usePresetMutation(presetId, ({ action, values = {}, version, idempotencyKey }) => api.post(`/platform/presets/${presetId}/actions/${action}`, values, action === "clone" ? { idempotencyKey } : { ifMatch: version }));
