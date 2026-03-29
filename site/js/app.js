/**
 * App shell — minimal registry for future modules (dashboard, CRM slices, mobile shell).
 * Mobile app later can reuse the same feature keys via a thin native wrapper.
 */
const features = new Map();
let authToken = null;

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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { cache: "no-store", ...options });
  if (!response.ok) {
    throw new Error(`${response.status}`);
  }
  return response.json();
}

function authFetchOptions(options = {}) {
  if (!authToken) {
    return options;
  }
  return {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      authorization: `Bearer ${authToken}`
    }
  };
}

export async function loadApiStatus() {
  const statusEl = document.querySelector("[data-api-status]");
  if (!statusEl) return;

  try {
    const [health, meta] = await Promise.all([fetchJson("/health"), fetchJson("/v1/meta")]);
    statusEl.textContent = `API hoạt động (${health.service}) · ${meta.release.apiCompat} · v${meta.release.version}`;
    statusEl.dataset.state = "ok";
  } catch (error) {
    statusEl.textContent = "Không thể kết nối API realtime";
    statusEl.dataset.state = "error";
    console.warn("[cios] api status unavailable", error);
  }
}

export async function loadCompliancePolicies() {
  const container = document.querySelector("[data-policy-list]");
  if (!container) return;

  try {
    const data = await fetchJson("/v1/compliance/policies");
    container.innerHTML = "";
    for (const policy of data.policies) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = policy.path;
      link.textContent = policy.title;
      item.appendChild(link);
      container.appendChild(item);
    }
  } catch (error) {
    container.innerHTML = "";
    const item = document.createElement("li");
    item.textContent = "Danh mục compliance sẽ hiển thị khi API sẵn sàng.";
    container.appendChild(item);
    console.warn("[cios] compliance policies unavailable", error);
  }
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.textContent = value;
}

export async function loadAuthMemberSnapshot() {
  const plansEl = document.querySelector("[data-member-plans]");
  if (!plansEl) return;

  try {
    await fetchJson("/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@iai.one",
        password: "demo123456",
        displayName: "Demo Admin",
        workspaceCode: "demo"
      })
    }).catch(() => {
      // Existing account is expected after first boot.
    });

    const [session, plans] = await Promise.all([
      fetchJson("/v1/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "admin@iai.one",
          password: "demo123456",
          workspaceCode: "demo"
        })
      }),
      fetchJson("/v1/members/plans")
    ]);
    authToken = session.token;

    setText("[data-auth-email]", session.member.email);
    setText("[data-auth-plan]", `${session.member.plan} (${session.member.role})`);
    setText("[data-auth-token-size]", `${session.token.length} chars`);

    plansEl.innerHTML = "";
    for (const plan of plans.plans) {
      const item = document.createElement("li");
      const price = plan.monthlyUsd === null ? "contact sales" : `$${plan.monthlyUsd}/mo`;
      item.textContent = `${plan.title}: ${price} · seats ${plan.limits.seats ?? "custom"} · records ${plan.limits.orgRecords ?? "custom"}`;
      plansEl.appendChild(item);
    }
  } catch (error) {
    setText("[data-auth-email]", "API unavailable");
    setText("[data-auth-plan]", "unknown");
    setText("[data-auth-token-size]", "0");
    plansEl.innerHTML = "<li>Không thể tải member plans.</li>";
    console.warn("[cios] auth/member snapshot unavailable", error);
  }
}

export async function loadCrmSnapshot() {
  const listEl = document.querySelector("[data-crm-list]");
  const detailEl = document.querySelector("[data-crm-detail]");
  if (!listEl || !detailEl) return;

  try {
    const data = await fetchJson("/v1/crm/organizations", authFetchOptions());
    listEl.innerHTML = "";
    for (const org of data.data) {
      const item = document.createElement("li");
      item.textContent = `${org.name} (${org.domain}) · fit ${org.fitScore} · intent ${org.intentScore} · ${org.stage}`;
      listEl.appendChild(item);
    }

    if (data.data[0]) {
      const detail = await fetchJson(
        `/v1/crm/organizations/${data.data[0].id}`,
        authFetchOptions()
      );
      const org = detail.data;
      detailEl.textContent = `${org.name} | owner: ${org.owner} | next: ${org.nextActions[0]}`;
    }
  } catch (error) {
    listEl.innerHTML = "<li>Không thể tải CRM list.</li>";
    detailEl.textContent = "Không thể tải CRM detail.";
    console.warn("[cios] crm snapshot unavailable", error);
  }
}

export async function loadComplianceOpsSnapshot() {
  const auditEl = document.querySelector("[data-compliance-audit]");
  const retentionEl = document.querySelector("[data-compliance-retention]");
  if (!auditEl || !retentionEl) return;

  try {
    const [audit, retention] = await Promise.all([
      fetchJson("/v1/compliance/audit-log", authFetchOptions()),
      fetchJson("/v1/compliance/retention-rules", authFetchOptions())
    ]);

    auditEl.innerHTML = "";
    for (const entry of audit.entries) {
      const item = document.createElement("li");
      item.textContent = `${entry.type}: ${entry.message}`;
      auditEl.appendChild(item);
    }

    retentionEl.innerHTML = "";
    for (const rule of retention.rules) {
      const item = document.createElement("li");
      item.textContent = `${rule.dataClass} -> ${rule.retentionDays}d (${rule.strategy})`;
      retentionEl.appendChild(item);
    }
  } catch (error) {
    auditEl.innerHTML = "<li>Không thể tải audit log.</li>";
    retentionEl.innerHTML = "<li>Không thể tải retention rules.</li>";
    console.warn("[cios] compliance ops snapshot unavailable", error);
  }
}

export async function loadDiscoverySnapshot() {
  const sourcesEl = document.querySelector("[data-discovery-sources]");
  const governanceEl = document.querySelector("[data-discovery-governance]");
  if (!sourcesEl || !governanceEl) return;

  try {
    const [sources, governance] = await Promise.all([
      fetchJson("/v1/discovery/sources", authFetchOptions()),
      fetchJson("/v1/discovery/crawl-governance", authFetchOptions())
    ]);

    sourcesEl.innerHTML = "";
    for (const source of sources.queue) {
      const item = document.createElement("li");
      item.textContent = `${source.sourceUrl} · ${source.eligibility} · risk ${source.riskLevel}`;
      sourcesEl.appendChild(item);
    }

    governanceEl.innerHTML = "";
    for (const decision of governance.decisions) {
      const item = document.createElement("li");
      item.textContent = `${decision.domain}: ${decision.decision} (${decision.reason})`;
      governanceEl.appendChild(item);
    }
  } catch (error) {
    sourcesEl.innerHTML = "<li>Không thể tải source discovery queue.</li>";
    governanceEl.innerHTML = "<li>Không thể tải crawl governance decisions.</li>";
    console.warn("[cios] discovery snapshot unavailable", error);
  }
}

if (typeof window !== "undefined") {
  window.CIOS = {
    registerFeature,
    mountFeature,
    loadVersionBadge,
    loadApiStatus,
    loadCompliancePolicies,
    loadAuthMemberSnapshot,
    loadCrmSnapshot,
    loadComplianceOpsSnapshot,
    loadDiscoverySnapshot
  };
}
