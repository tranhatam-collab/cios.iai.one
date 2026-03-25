/**
 * App shell — minimal registry for future modules (dashboard, CRM slices, mobile shell).
 * Mobile app later can reuse the same feature keys via a thin native wrapper.
 */
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
    el.textContent = "v—";
  }
}

if (typeof window !== "undefined") {
  window.CIOS = { registerFeature, mountFeature, loadVersionBadge };
}
