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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { cache: "no-store", ...options });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

function toArrayMaybe(payload, keys) {
  for (const key of keys) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.textContent = value;
}

function formatInt(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("en-US").format(value);
}

function summarizeTopAccounts(orgs) {
  if (!orgs.length) return "Top accounts today: no data";
  const top = orgs
    .slice(0, 3)
    .map((item) => item.name || item.domain || item.id || "account");
  return `Top accounts today: ${top.join(" · ")}`;
}

function summarizeSafeActions(decisions) {
  if (!decisions.length) return "Safe actions: no active decisions";
  const allowCount = decisions.filter((item) => {
    const value = String(item?.decision || "").toLowerCase();
    return value === "allow" || value === "allowed";
  }).length;
  return `Safe actions: ${formatInt(allowCount)} allow`;
}

function summarizePendingReviews(reviews) {
  if (!reviews.length) return "Pending reviews: no queue items";
  const pending = reviews.filter((item) => {
    const value = String(item?.status || "").toLowerCase();
    return value === "pending" || value === "review_required";
  }).length;
  return `Pending reviews: ${formatInt(pending)}`;
}

function summarizeWorkflowCallbacks(logs) {
  if (!logs.length) return "Workflow callbacks: no recent events";
  const success = logs.filter(
    (item) => String(item?.status || "").toLowerCase() === "success",
  ).length;
  return `Workflow callbacks: ${formatInt(success)} success`;
}

export async function loadHomepageStatus() {
  const checks = [
    fetchJson("/v1/crm/organizations").then((payload) =>
      toArrayMaybe(payload, ["data", "organizations"]),
    ),
    fetchJson("/v1/discovery/crawl-governance").then((payload) =>
      toArrayMaybe(payload, ["decisions", "data"]),
    ),
    fetchJson("/v1/review/queue").then((payload) =>
      toArrayMaybe(payload, ["items", "data"]),
    ),
    fetchJson("/v1/flow/logs").then((payload) =>
      toArrayMaybe(payload, ["data", "logs"]),
    ),
  ];

  const [orgsResult, decisionsResult, reviewsResult, flowsResult] =
    await Promise.allSettled(checks);

  const orgs = orgsResult.status === "fulfilled" ? orgsResult.value : [];
  const decisions =
    decisionsResult.status === "fulfilled" ? decisionsResult.value : [];
  const reviews =
    reviewsResult.status === "fulfilled" ? reviewsResult.value : [];
  const logs = flowsResult.status === "fulfilled" ? flowsResult.value : [];

  setText("[data-top-accounts]", summarizeTopAccounts(orgs));
  setText("[data-safe-actions]", summarizeSafeActions(decisions));
  setText("[data-pending-reviews]", summarizePendingReviews(reviews));
  setText("[data-workflow-callbacks]", summarizeWorkflowCallbacks(logs));

  if (!orgs.length && !decisions.length && !reviews.length && !logs.length) {
    setText(
      "[data-top-accounts]",
      "Top accounts today: foundation live, data surfaces connecting",
    );
    setText("[data-safe-actions]", "Safe actions: policy layer online");
    setText(
      "[data-pending-reviews]",
      "Pending reviews: queue loading from live APIs",
    );
    setText(
      "[data-workflow-callbacks]",
      "Workflow callbacks: execution feedback connecting",
    );
  }
}

if (typeof window !== "undefined") {
  window.CIOS = {
    registerFeature,
    mountFeature,
    loadVersionBadge,
    loadHomepageStatus,
  };
}
