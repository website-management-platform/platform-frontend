import { useQuery } from "@tanstack/react-query";
import { API_REALM } from "@/config/app.config";

// Yalnız geliştirme: backend'in yerel profilindeki /__dev yardımcıları. Üretim derlemesinde IS_DEV_TOOLS false olur ve bu kod kullanılmaz.
export const IS_DEV_TOOLS = import.meta.env.DEV;

const devGet = async (path) => {
  const response = await fetch(`/__dev${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`dev ${response.status}`);
  return response.json();
};

export const useDemoAccounts = () => useQuery({
  queryKey: ["dev", "demo-accounts", API_REALM],
  queryFn: () => devGet(`/demo-accounts?realm=${API_REALM}`),
  enabled: IS_DEV_TOOLS,
  staleTime: Infinity,
  retry: false,
});

export const useMailbox = () => useQuery({
  queryKey: ["dev", "mailbox", API_REALM],
  queryFn: () => devGet(`/mailbox?realm=${API_REALM}`),
  enabled: IS_DEV_TOOLS,
  refetchInterval: 5000,
});
