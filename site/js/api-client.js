/**
 * CIOS shared API client — single source for Workers/Fastify base URL.
 */

export const DEFAULT_REMOTE_API_BASE =
  "https://cios-workers-api.tranhatam.workers.dev";

export function detectApiBase() {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  const runtimeBase =
    window.CIOS_API_BASE ||
    document.documentElement.getAttribute("data-api-base") ||
    document.body?.getAttribute("data-api-base");
  if (runtimeBase && runtimeBase.trim().length > 0) {
    return runtimeBase.trim().replace(/\/$/, "");
  }
  if (
    host.endsWith("pages.dev") ||
    host === "cios.iai.one" ||
    host === "www.cios.iai.one"
  ) {
    return DEFAULT_REMOTE_API_BASE;
  }
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:3000";
  }
  return DEFAULT_REMOTE_API_BASE;
}

export function getApiBase() {
  return detectApiBase();
}

export function apiUrl(path) {
  const base = getApiBase();
  if (!path.startsWith("/")) path = "/" + path;
  return `${base}${path}`;
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cios.auth.token");
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem("cios.auth.token", token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("cios.auth.token");
}

export function restoreTokenFromStorage() {
  return getToken();
}

export function readApiError(payload, fallback = "Request failed.") {
  if (!payload || typeof payload !== "object") return fallback;
  if (payload.error?.message) return payload.error.message;
  if (typeof payload.message === "string") return payload.message;
  return fallback;
}

export async function apiGet(path) {
  const token = getToken();
  const res = await fetch(apiUrl(path), {
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    const error = new Error(readApiError(data, `${res.status}: ${res.statusText}`));
    error.payload = data;
    throw error;
  }
  return data;
}

export async function apiPost(path, body) {
  const token = getToken();
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    const error = new Error(readApiError(data, `${res.status}: ${res.statusText}`));
    error.payload = data;
    throw error;
  }
  return data;
}
