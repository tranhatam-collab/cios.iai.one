const features = new Map();

export function registerFeature(id, factory) {
  if (features.has(id)) {
    console.warn(`[cios] feature already registered: ${id}`);
  }
  features.set(id, factory);
}

export function mountFeature(id, root) {
  const factory = features.get(id);
  if (!factory) return null;
  return factory(root);
}

export async function loadVersionBadge() {
  const el = document.querySelector("[data-version-label]");
  if (!el) return;

  try {
    const res = await fetch("/version.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    el.textContent = `v${data.version} · ${data.apiCompat}`;
    el.setAttribute("title", data.policy ?? "");
  } catch {
    el.textContent = "v--";
  }
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.textContent = value;
}

export async function loadHomepageStatus() {
  // Public homepage does not call authenticated Workers product routes.
  // Authenticated surfaces live under /app after login (R1).
  setText(
    "[data-top-accounts]",
    "Top accounts today: sign in to /app to load workspace data",
  );
  setText("[data-safe-actions]", "Safe actions: available after authentication");
  setText(
    "[data-pending-reviews]",
    "Pending reviews: available in the authenticated app",
  );
  setText(
    "[data-workflow-callbacks]",
    "Workflow callbacks: available after authentication",
  );
}

if (typeof window !== "undefined") {
  window.CIOS = {
    registerFeature,
    mountFeature,
    loadVersionBadge,
    loadHomepageStatus,
  };
}
