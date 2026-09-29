const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

let onUnauthorized = null;

/** Registered once by AuthProvider so a 401 anywhere can force a clean logout. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

function getToken() {
  try {
    return localStorage.getItem("ghss_token");
  } catch {
    return null;
  }
}

async function request(path, { method = "GET", body, query, isForm = false, ...rest } = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
  }

  const headers = { ...(rest.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : await response.blob();

  if (!response.ok) {
    const detail = isJson ? payload?.detail : null;
    const message = typeof detail === "string" ? detail : response.statusText || "Request failed";
    if (response.status === 401 && onUnauthorized) onUnauthorized();
    throw new ApiError(message, response.status, detail);
  }

  return payload;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
  /** Returns a Blob (e.g. certificate PDF download) instead of parsed JSON. */
  getBlob: (path, opts) => request(path, { ...opts, method: "GET" }),
  postForm: (path, formData, opts) => request(path, { ...opts, method: "POST", body: formData, isForm: true }),
};

export function getStoredToken() {
  return getToken();
}
