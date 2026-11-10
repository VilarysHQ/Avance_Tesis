const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:3001/api";

const DEFAULT_TIMEOUT = 15000;
let adminCsrfToken = null;

function buildRequestError(
  message,
  {
    status = null,
    details = null,
    isNetworkError = false,
    isTimeout = false,
    isCancelled = false,
  } = {}
) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  error.isNetworkError = isNetworkError;
  error.isTimeout = isTimeout;
  error.isCancelled = isCancelled;
  return error;
}

/**
 * Realiza una petición al backend y devuelve el JSON de la respuesta.
 *
 * En caso de error lanza un Error con información útil para la interfaz:
 * - status: código HTTP (null si fue un fallo de red)
 * - details: arreglo de mensajes de validación del backend (si existen)
 * - isNetworkError: true cuando no se pudo contactar al servidor
 *
 * Nunca expone stack traces ni detalles técnicos crudos.
 */
export async function apiRequest(path, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;
  const controller = new AbortController();
  const externalSignal = fetchOptions.signal;
  let timedOut = false;
  const forwardAbort = () => controller.abort(externalSignal?.reason);
  externalSignal?.addEventListener("abort", forwardAbort, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers ?? {}),
      },
      signal: controller.signal,
    });
  } catch {
    if (timedOut) {
      throw buildRequestError("El asistente tardó demasiado en responder.", {
        isTimeout: true,
      });
    }
    if (externalSignal?.aborted) {
      throw buildRequestError("La solicitud fue cancelada.", {
        isCancelled: true,
      });
    }
    throw buildRequestError("No pudimos conectar con el servidor.", {
      isNetworkError: true,
    });
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", forwardAbort);
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw buildRequestError(
      payload?.error ?? `Error ${response.status} al procesar la solicitud.`,
      { status: response.status, details: payload?.details ?? null }
    );
  }

  return payload;
}

async function adminRequest(path, options = {}) {
  const method = options.method ?? "GET";
  const headers = { ...(options.headers ?? {}) };
  if (method !== "GET" && method !== "HEAD" && adminCsrfToken) {
    headers["X-CSRF-Token"] = adminCsrfToken;
  }

  try {
    return await apiRequest(path, {
      ...options,
      method,
      headers,
      credentials: "include",
    });
  } catch (error) {
    if (error.status === 401) adminCsrfToken = null;
    throw error;
  }
}

function rememberAdminSession(payload) {
  adminCsrfToken = typeof payload?.csrfToken === "string" ? payload.csrfToken : null;
  return payload;
}

export async function loginAdmin(email, password) {
  const payload = await apiRequest("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  return rememberAdminSession(payload);
}

export async function getAdminSession() {
  const payload = await adminRequest("/admin/auth/session");
  return rememberAdminSession(payload);
}

export async function logoutAdmin() {
  try {
    return await adminRequest("/admin/auth/logout", { method: "POST" });
  } finally {
    adminCsrfToken = null;
  }
}

export function getHealth() {
  return apiRequest("/health");
}

/**
 * Devuelve la lista de cotizaciones/solicitudes registradas.
 * GET /api/quotes
 */
export async function getQuotes() {
  const body = await adminRequest("/quotes");
  return body?.data ?? [];
}

/**
 * Actualiza el estado de una cotización.
 * PATCH /api/quotes/:id/status
 */
export function updateQuoteStatus(id, status) {
  return adminRequest(`/quotes/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function createLead(data) {
  return adminRequest("/leads", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function createQuote(data) {
  return adminRequest("/quotes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Crea de forma transaccional un lead y su cotización asociada.
 * Devuelve { data: { lead, quote } }.
 */
export function createQuoteRequest(data) {
  return apiRequest("/quote-requests", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

const REQUIREMENTS_TIMEOUT = 35_000;

function isRequirementsPayload(payload) {
  return (
    payload?.success === true &&
    payload.requirements &&
    typeof payload.requirements === "object" &&
    payload.fieldStatus &&
    typeof payload.fieldStatus === "object" &&
    Array.isArray(payload.missingFields) &&
    Array.isArray(payload.ambiguousFields) &&
    typeof payload.complete === "boolean" &&
    typeof payload.assistantReply === "string" &&
    payload.assistantReply.trim().length > 0 &&
    (payload.offeredOptionsField === null ||
      typeof payload.offeredOptionsField === "string") &&
    Array.isArray(payload.offeredOptions) &&
    (payload.followUpQuestion === null ||
      typeof payload.followUpQuestion === "string")
  );
}

export async function extractRequirements(message, context = null, { signal } = {}) {
  const payload = await apiRequest("/ai/requirements", {
    method: "POST",
    body: JSON.stringify({ message, context }),
    timeout: REQUIREMENTS_TIMEOUT,
    signal,
  });

  if (!isRequirementsPayload(payload)) {
    throw buildRequestError("El servidor devolvió una respuesta no válida.");
  }

  return payload;
}

export { API_BASE_URL };
