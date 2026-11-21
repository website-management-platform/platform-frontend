import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_REALM } from "@/config/app.config";
import { api } from "@/api/http";
import { ApiError } from "@/api/errors";
import { queryKeys } from "@/api/queryKeys";

// Sözleşme: docs/backend/01-identity.md
const authPath = (path) => `/auth/${API_REALM}${path}`;

const SESSION_STALE_TIME = 5 * 60 * 1000;

const fetchSession = async () => {
  try {
    return await api.get(authPath("/me"));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
};

export const useSession = () => useQuery({
  queryKey: queryKeys.session(),
  queryFn: fetchSession,
  staleTime: SESSION_STALE_TIME,
});

export const useCurrentUser = () => useSession().data?.user ?? null;

// Platform realm'inde oturum özeti izin listesini taşır; müşteri izinleri site bağlamından gelir.
const NO_PERMISSIONS = [];

export const usePlatformCan = () => {
  const permissions = useSession().data?.permissions ?? NO_PERMISSIONS;
  return useCallback((permission) => permissions.includes(permission), [permissions]);
};

// Yeni oturumda önceki kullanıcıya ait önbellek tamamen silinir; oturum özeti sunucudan yeniden okunur.
const beginSession = (queryClient) => {
  queryClient.clear();
  return queryClient.fetchQuery({ queryKey: queryKeys.session(), queryFn: fetchSession });
};

const isAuthenticated = (result) => result?.status === "AUTHENTICATED";

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values) => api.post(authPath("/login"), values),
    onSuccess: async (result) => {
      if (isAuthenticated(result)) await beginSession(queryClient);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(authPath("/logout")),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(queryKeys.session(), null);
    },
  });
};

export const useForgotPassword = () => useMutation({
  mutationFn: (email) => api.post(authPath("/forgot"), { email }),
});

export const useResetPassword = () => useMutation({
  mutationFn: (values) => api.post(authPath("/reset"), values),
});

// Şifre değiştirme: bu oturum açık kalır, diğer cihazlardaki oturumlar kapanır (01-identity.md, POST /password).
export const useChangePassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values) => api.post(authPath("/password"), values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sessions() }),
  });
};

export const useSessions = () => useQuery({
  queryKey: queryKeys.sessions(),
  queryFn: () => api.get(authPath("/sessions")),
});

export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => api.delete(authPath(`/sessions/${sessionId}`)),
    onSuccess: (_, sessionId) => {
      const current = queryClient.getQueryData(queryKeys.sessions())?.items.find((item) => item.current);
      if (current?.id === sessionId) {
        queryClient.clear();
        queryClient.setQueryData(queryKeys.session(), null);
        return undefined;
      }
      return queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
    },
  });
};
