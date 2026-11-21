import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError } from "@/api/errors";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

const AUTOSAVE_DELAY_MS = 1200;

/**
 * Tasarımcı taslağının otomatik kaydı (şartname §25.2: revision/ETag; eşzamanlı düzenlemede sessiz üzerine yazma yok).
 * Yerel taslak sunucudakinden ayrılınca kısa bir beklemeden sonra If-Match ile kaydedilir. 412 gelirse kayıt durur
 * ve "conflict" durumuna geçilir; kullanıcı sunucudaki taslağı yüklemeyi seçer.
 * save(draft, version) yeni kaydı (version alanıyla) döndürmelidir.
 */
export const useDraftAutosave = ({ serverDraft, serverVersion, save, enabled = true }) => {
  const [draft, setDraft] = useState(serverDraft);
  const [status, setStatus] = useState("saved");
  const [error, setError] = useState(null);
  // Kayıt sürerken gelen değişiklikler kayıt bitince ayrıca kaydedilsin diye her kayıttan sonra artar.
  const [saveCount, setSaveCount] = useState(0);
  const versionRef = useRef(serverVersion);
  const savedRef = useRef(serverDraft);
  const inFlightRef = useRef(false);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback(async (value) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStatus("saving");
    try {
      const record = await saveRef.current(value, versionRef.current);
      versionRef.current = record.version;
      savedRef.current = value;
      setError(null);
      setStatus((current) => (current === "saving" ? "saved" : current === "dirty" ? "dirty" : current));
    } catch (saveError) {
      setError(saveError);
      setStatus(isApiError(saveError, "PRECONDITION_FAILED") ? "conflict" : "error");
    } finally {
      inFlightRef.current = false;
      setSaveCount((count) => count + 1);
    }
  }, []);

  useEffect(() => {
    if (!enabled || status === "conflict" || status === "error" || draft === savedRef.current) return undefined;
    const timer = setTimeout(() => flush(draft), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, enabled, flush, status, saveCount]);

  const change = useCallback((updater) => {
    setDraft((current) => (typeof updater === "function" ? updater(current) : updater));
    setStatus((current) => (current === "conflict" ? current : "dirty"));
  }, []);

  /** Sunucudaki kaydı yerel taslağın yerine koyar (çakışma çözümü, yayın veya geri alma sonrası). */
  const reset = useCallback((nextDraft, nextVersion) => {
    versionRef.current = nextVersion;
    savedRef.current = nextDraft;
    setDraft(nextDraft);
    setError(null);
    setStatus("saved");
  }, []);

  const pending = status === "dirty" || status === "saving" || status === "error";
  useUnsavedChangesGuard(enabled && pending);

  return { draft, change, status, error, reset, saveNow: () => flush(draft), version: versionRef };
};
