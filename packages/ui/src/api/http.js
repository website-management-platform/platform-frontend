import { API_REALM } from "@/config/app.config";
import { ApiError } from "./errors";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
// Geliştirmede iki panel aynı "localhost" adını paylaşır; çerez adı realm ile ayrılır (00-conventions.md §4).
const CSRF_COOKIE_NAME = `${API_REALM.toUpperCase()}-XSRF-TOKEN`;
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];
const REQUEST_TIMEOUT_MS = 30_000;

const withTimeout = (signal) => {
  if (typeof AbortSignal.timeout !== "function") return signal;
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  if (!signal) return timeout;
  return typeof AbortSignal.any === "function" ? AbortSignal.any([signal, timeout]) : signal;
};

let csrfRequest = null;

const readCookie = (name) => {
  const prefix = `${name}=`;
  const entry = document.cookie.split("; ").find((item) => item.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
};

const buildUrl = (path, query) => {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, String(item)));
    else url.searchParams.set(key, String(value));
  });
  return url.origin === window.location.origin ? `${url.pathname}${url.search}` : url.toString();
};

const parseBody = async (response) => {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("json")) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const fetchCsrfToken = async () => {
  const response = await fetch(buildUrl(`/auth/${API_REALM}/csrf`), { credentials: "include" });
  if (!response.ok) throw ApiError.fromResponse(response, await parseBody(response));
  return readCookie(CSRF_COOKIE_NAME);
};

const ensureCsrfToken = async ({ refresh = false } = {}) => {
  if (!refresh) {
    const existing = readCookie(CSRF_COOKIE_NAME);
    if (existing) return existing;
  }
  if (!csrfRequest) {
    csrfRequest = fetchCsrfToken().finally(() => {
      csrfRequest = null;
    });
  }
  return csrfRequest;
};

const send = async (method, path, { body, query, signal, idempotencyKey, ifMatch, csrfToken, keepalive, headers: extraHeaders }) => {
  // Ek başlıklar zorunlu başlıkların üzerine yazamaz.
  const headers = { ...extraHeaders, Accept: "application/json, application/problem+json" };
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (csrfToken) headers[CSRF_HEADER_NAME] = csrfToken;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  if (ifMatch !== undefined) headers["If-Match"] = String(ifMatch);

  try {
    return await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined || isFormData ? body : JSON.stringify(body),
      credentials: "include",
      keepalive: keepalive || undefined,
      signal: withTimeout(signal),
    });
  } catch (error) {
    if (error?.name === "AbortError" && signal?.aborted) throw error;
    throw ApiError.network(error);
  }
};

export const apiRequest = async (method, path, options = {}) => {
  const isMutation = !SAFE_METHODS.includes(method);
  let csrfToken = isMutation ? await ensureCsrfToken() : null;
  let response = await send(method, path, { ...options, csrfToken });
  let payload = await parseBody(response);

  if (isMutation && response.status === 403 && payload?.code === "CSRF_TOKEN_INVALID") {
    csrfToken = await ensureCsrfToken({ refresh: true });
    response = await send(method, path, { ...options, csrfToken });
    payload = await parseBody(response);
  }

  if (!response.ok) throw ApiError.fromResponse(response, payload);
  return response.status === 204 ? null : payload;
};

export const api = {
  get: (path, options) => apiRequest("GET", path, options),
  post: (path, body, options) => apiRequest("POST", path, { ...options, body }),
  put: (path, body, options) => apiRequest("PUT", path, { ...options, body }),
  patch: (path, body, options) => apiRequest("PATCH", path, { ...options, body }),
  delete: (path, options) => apiRequest("DELETE", path, options),
  upload: (path, formData, options) => apiRequest("POST", path, { ...options, body: formData }),
};

export const createIdempotencyKey = () => crypto.randomUUID();

/**
 * Dosya baytlarını yükleme adresine gönderir ve ilerlemeyi bildirir (fetch ilerleme vermediği için XMLHttpRequest).
 * Adres sunucunun döndürdüğü yükleme adresidir; CSRF ve çerez kuralları diğer isteklerle aynıdır.
 * onProgress(0–1). signal ile iptal edilebilir.
 */
// Yükleme adresi nesne deposunun imzalı adresiyse (başka köken) yetki adresin imzasındadır: çerez ve CSRF başlığı
// gönderilmez. Aynı kökendeki adres (geliştirme mock'u) oturumla korunur.
const isSameOrigin = (url) => new URL(url, window.location.href).origin === window.location.origin;

export const uploadBytes = async (url, file, { method = "PUT", onProgress, signal } = {}) => {
  const sameOrigin = isSameOrigin(url);
  const csrfToken = sameOrigin ? await ensureCsrfToken() : null;
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, url);
    request.withCredentials = sameOrigin;
    if (csrfToken) request.setRequestHeader(CSRF_HEADER_NAME, csrfToken);
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }
      let payload;
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        payload = null;
      }
      reject(ApiError.fromResponse({ status: request.status, headers: { get: (name) => request.getResponseHeader(name) } }, payload));
    };
    request.onerror = () => reject(ApiError.network(new Error("upload failed")));
    request.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", () => request.abort(), { once: true });
    request.send(file);
  });
};
