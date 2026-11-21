const ERROR_MESSAGES = {
  NETWORK_ERROR: "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.",
  UNAUTHENTICATED: "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.",
  PERMISSION_DENIED: "Bu işlem için yetkiniz yok.",
  NOT_FOUND: "Aradığınız kayıt bulunamadı.",
  MALFORMED_REQUEST: "İstek işlenemedi. Sayfayı yenileyip tekrar deneyin.",
  CONFLICT: "İşlem kaydın güncel durumuyla çakışıyor. Sayfayı yenileyip tekrar deneyin.",
  PRECONDITION_FAILED: "Bu kayıt siz düzenlerken başka biri tarafından değiştirildi. Güncel hâlini yükleyip tekrar deneyin.",
  PRECONDITION_REQUIRED: "Kaydın sürüm bilgisi eksik. Sayfayı yenileyip tekrar deneyin.",
  PAYLOAD_TOO_LARGE: "Gönderilen içerik izin verilen boyutu aşıyor.",
  UNSUPPORTED_MEDIA_TYPE: "Bu dosya veya içerik türü desteklenmiyor.",
  RATE_LIMITED: "Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin.",
  VALIDATION_FAILED: "Lütfen işaretli alanları düzeltin.",
  CSRF_TOKEN_INVALID: "Güvenlik doğrulaması başarısız oldu. Sayfayı yenileyip tekrar deneyin.",
  IDEMPOTENCY_KEY_REUSED: "Bu işlem farklı bilgilerle zaten gönderildi.",
  SERVICE_UNAVAILABLE: "Hizmet şu anda kullanılamıyor. Lütfen birazdan tekrar deneyin.",
  INTERNAL_ERROR: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
};

const STATUS_FALLBACK_CODES = {
  400: "MALFORMED_REQUEST",
  401: "UNAUTHENTICATED",
  403: "PERMISSION_DENIED",
  404: "NOT_FOUND",
  409: "CONFLICT",
  412: "PRECONDITION_FAILED",
  413: "PAYLOAD_TOO_LARGE",
  415: "UNSUPPORTED_MEDIA_TYPE",
  422: "VALIDATION_FAILED",
  428: "PRECONDITION_REQUIRED",
  429: "RATE_LIMITED",
  503: "SERVICE_UNAVAILABLE",
};

const parseRetryAfter = (value) => {
  if (!value) return null;
  const seconds = Number.parseInt(value, 10);
  if (!Number.isNaN(seconds)) return seconds;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
};

export class ApiError extends Error {
  constructor({ status, code, title, detail, fieldErrors = [], requestId = null, retryAfter = null, cause }) {
    super(detail || title || code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.title = title;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
    if (cause) this.cause = cause;
  }

  static fromResponse(response, payload) {
    const problem = payload && typeof payload === "object" ? payload : {};
    const fallbackCode = STATUS_FALLBACK_CODES[response.status]
      ?? (response.status >= 500 ? "INTERNAL_ERROR" : "MALFORMED_REQUEST");
    return new ApiError({
      status: response.status,
      code: problem.code ?? fallbackCode,
      title: problem.title,
      detail: problem.detail,
      fieldErrors: Array.isArray(problem.errors) ? problem.errors : [],
      requestId: problem.requestId ?? response.headers.get("X-Request-Id"),
      retryAfter: parseRetryAfter(response.headers.get("Retry-After")),
    });
  }

  static network(cause) {
    return new ApiError({ status: 0, code: "NETWORK_ERROR", cause });
  }
}

export const isApiError = (error, code) => error instanceof ApiError && (code === undefined || error.code === code);

export const getErrorMessage = (error, fallback = ERROR_MESSAGES.INTERNAL_ERROR) => {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === "RATE_LIMITED" && error.retryAfter) {
    return `Çok fazla deneme yapıldı. ${error.retryAfter} saniye sonra tekrar deneyin.`;
  }
  return ERROR_MESSAGES[error.code] ?? error.detail ?? fallback;
};

export const getFieldErrors = (error) => {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(error.fieldErrors.map((fieldError) => [fieldError.path, fieldError.message]));
};
