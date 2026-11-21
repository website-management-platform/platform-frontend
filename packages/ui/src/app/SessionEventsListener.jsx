import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { sessionEvents } from "@/api/sessionEvents";
import { toast } from "@/components/Toast/toast";

const NOTICE_COOLDOWN = 4000;

// Herhangi bir istekte 401 gelirse önbellek temizlenir; RequireSession giriş sayfasına yönlendirir.
const SessionEventsListener = () => {
  const queryClient = useQueryClient();
  const lastNoticeRef = useRef(0);

  useEffect(() => sessionEvents.subscribe(({ type }) => {
    if (type !== "unauthorized") return;
    const hadSession = Boolean(queryClient.getQueryData(queryKeys.session()));
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "session" });
    queryClient.setQueryData(queryKeys.session(), null);
    if (hadSession && Date.now() - lastNoticeRef.current > NOTICE_COOLDOWN) {
      lastNoticeRef.current = Date.now();
      toast.warning("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
    }
  }), [queryClient]);

  return null;
};

export default SessionEventsListener;
