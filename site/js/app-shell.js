/**
 * CIOS App Shell — shared helpers for /app/* pages
 */

export {
  apiGet,
  apiPost,
  apiUrl,
  clearToken,
  detectApiBase,
  getApiBase,
  getToken,
  readApiError,
  restoreTokenFromStorage,
  setToken
} from "./api-client.js";

import {
  apiGet,
  apiPost,
  clearToken,
  getToken
} from "./api-client.js";

export function renderSidebar(currentPath) {
  const sidebar = document.querySelector(".cios-sidebar");
  if (!sidebar) return;
  const links = [
    { href: "/app/", label: "Dashboard", icon: "⌂" },
    { href: "/app/accounts/", label: "Accounts", icon: "◎" },
    { href: "/app/signals/", label: "Signals", icon: "⚡" },
    { href: "/app/priorities/", label: "Priorities", icon: "▲" },
    { href: "/app/actions/", label: "Actions", icon: "✓" },
    { href: "/app/import/", label: "Import", icon: "↑" },
    { href: "/app/audit/", label: "Audit", icon: "◉" },
    { href: "/app/settings/", label: "Settings", icon: "⚙" },
  ];
  const html = links
    .map((l) => {
      const active = currentPath === l.href ? 'aria-current="page"' : "";
      return `<a href="${l.href}" ${active}><span aria-hidden="true">${l.icon}</span> ${l.label}</a>`;
    })
    .join("");
  sidebar.innerHTML = `<div style="font-weight:700;margin-bottom:1rem;"><a href="/" style="text-decoration:none;color:inherit;">CIOS</a></div>` + html;
}

export function renderEmpty(container, message = "No data yet.") {
  if (!container) return;
  container.innerHTML = `<div class="cios-empty">${message}</div>`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString();
}

export function scoreBadge(score) {
  if (score >= 80) return `<span class="cios-badge cios-badge-green">${score}</span>`;
  if (score >= 60) return `<span class="cios-badge cios-badge-yellow">${score}</span>`;
  if (score >= 40) return `<span class="cios-badge cios-badge-blue">${score}</span>`;
  return `<span class="cios-badge cios-badge-red">${score}</span>`;
}

export function riskBadge(level) {
  const l = (level || "").toLowerCase();
  if (l === "low") return `<span class="cios-badge cios-badge-green">Low</span>`;
  if (l === "medium") return `<span class="cios-badge cios-badge-yellow">Medium</span>`;
  if (l === "high") return `<span class="cios-badge cios-badge-red">High</span>`;
  return `<span class="cios-badge cios-badge-blue">${level || "Unknown"}</span>`;
}

export function requireAuth(redirectTo = "/login/") {
  if (typeof window === "undefined") return false;
  const token = getToken();
  if (!token) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

export async function fetchMe() {
  try {
    return await apiGet("/v1/auth/me");
  } catch {
    return null;
  }
}

export function bindLogout() {
  const btn = document.getElementById("logout-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      await apiPost("/v1/auth/logout", {});
    } catch {
      // ignore
    }
    clearToken();
    window.location.href = "/login/";
  });
}

/** Normalize Workers/Fastify list envelopes for /app pages. */
export function unwrapList(payload, keys = []) {
  if (!payload || typeof payload !== "object") return [];
  const data = payload.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    const value = data?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}
