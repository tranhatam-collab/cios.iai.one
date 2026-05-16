const features = new Map();

const DEFAULT_API_BASE = "https://cios-workers-api.tranhatam66.workers.dev";
const LANG_KEY = "cios.language";
const TOKEN_KEY = "cios.workerToken";
const API_BASE_KEY = "cios.apiBase";

const translations = {
  vi: {
    "site.skip": "Bỏ qua điều hướng",
    "header.tagline": "Customer Intelligence Operating System",
    "hero.eyebrow": "Trang sản phẩm sẵn sàng vận hành",
    "hero.title": "Hệ điều hành trí tuệ khách hàng công khai cho thời đại AI.",
    "hero.subtitle":
      "Tìm đúng công ty, hiểu đúng tín hiệu, kiểm soát đúng rủi ro, và hành động đúng lúc trên cùng một lớp intelligence, compliance và workflow control.",
    "hero.oneLine":
      "CIOS giúp tổ chức tìm đúng công ty, hiểu vì sao đáng chú ý, kiểm tra có an toàn để hành động hay không, và biết bước tiếp theo cần làm.",
    "hero.primary": "Mở ứng dụng",
    "hero.secondary": "Xem kiến trúc hệ thống",
    "hero.tertiary": "Constitutional Layer",
    "status.currentTitle": "Trạng thái hiện tại",
    "status.currentBody":
      "Shell PWA và các module nền đã hoạt động. Những bề mặt dữ liệu sống như realtime, CRM, compliance và governance đang được nối dần vào phiên bản vận hành thật.",
    "status.currentCta": "Xem sprint hiện tại",
    "nav.home": "Trang chủ",
    "nav.app": "Ứng dụng",
    "nav.docs": "Tài liệu",
    "nav.pricing": "Bảng giá",
    "app.header.subtitle": "App shell vận hành cho intelligence và quyết định",
    "app.hero.title": "Ứng dụng CIOS",
    "app.hero.subtitle":
      "Đây là app shell đang nối trực tiếp với bootstrap và overview contract từ Workers API.",
    "app.hero.back": "Về trang chủ",
    "app.hero.docs": "Xem tài liệu",
    "app.bootstrap.title": "Bootstrap",
    "app.bootstrap.loading": "Đang tải bootstrap...",
    "app.overview.title": "Overview",
    "app.overview.loading": "Đang tải overview...",
    "app.system.title": "Hệ thống",
    "app.system.loading": "Đang tải trạng thái hệ thống...",
    "app.demo.title": "Kết nối demo",
    "app.demo.copy":
      "Nếu chưa có bearer token, app shell sẽ chạy bằng public demo bootstrap từ Workers API.",
    "app.demo.api": "Workers API base",
    "app.demo.token": "Bearer token",
    "app.demo.connect": "Kết nối",
    "app.demo.clear": "Xóa token",
    "app.surface.crm": "CRM Surface",
    "app.surface.governance": "Governance",
    "app.surface.reasonCodes": "Reason codes",
    "pricing.title": "Chọn cách bạn muốn CIOS làm việc cho bạn.",
    "pricing.subtitle":
      "Từ thử nghiệm nhanh đến vận hành toàn bộ hệ thống customer intelligence, CIOS mở rộng theo đúng nhu cầu của bạn.",
    "pricing.cta.free": "Bắt đầu miễn phí",
    "pricing.cta.pro": "Bắt đầu Pro",
    "pricing.cta.business": "Nâng cấp Business",
    "pricing.cta.enterprise": "Liên hệ đội ngũ",
    "deck.title": "Enterprise Sales Deck",
    "deck.subtitle":
      "Bản trình bày đóng deal $50k - $500k, sẵn sàng export PDF.",
    "home.panel.topAccounts.loading": "Đang tải tài khoản nổi bật hôm nay...",
    "home.panel.safeActions.loading":
      "Đang tải trạng thái hành động an toàn...",
    "home.panel.pendingReviews.loading": "Đang tải hàng đợi phê duyệt...",
    "home.panel.workflow.loading": "Đang tải trạng thái workflow...",
    "home.panel.topAccounts.empty":
      "Tài khoản nổi bật hôm nay: chưa có dữ liệu",
    "home.panel.safeActions.empty":
      "Hành động an toàn: chưa có quyết định đang hoạt động",
    "home.panel.pendingReviews.empty": "Mục chờ duyệt: chưa có hàng đợi review",
    "home.panel.workflow.empty": "Workflow callback: chưa có sự kiện gần đây",
    "home.panel.topAccounts.fallback":
      "Tài khoản nổi bật hôm nay: nền tảng đã live, các bề mặt dữ liệu đang được kết nối",
    "home.panel.safeActions.fallback":
      "Hành động an toàn: lớp policy đã hoạt động",
    "home.panel.pendingReviews.fallback":
      "Mục chờ duyệt: hàng đợi đang nạp từ các API live",
    "home.panel.workflow.fallback":
      "Workflow callback: luồng phản hồi thực thi đang được kết nối",
    "app.auth.public": "Truy cập công khai (demo)",
    "app.auth.private": "Đã kết nối bằng bearer token",
    "app.auth.saved": "Đã lưu API base và token cục bộ.",
    "app.auth.cleared": "Đã xóa token cục bộ. App quay về chế độ public demo.",
    "app.auth.error": "Không thể tải bootstrap/overview từ Workers API.",
  },
  en: {
    "site.skip": "Skip navigation",
    "header.tagline": "Customer Intelligence Operating System",
    "hero.eyebrow": "Production-ready product front",
    "hero.title":
      "The public customer intelligence operating system for the AI era.",
    "hero.subtitle":
      "Find the right companies, understand the right signals, control risk precisely, and act at the right moment in one intelligence, compliance, and workflow control layer.",
    "hero.oneLine":
      "CIOS helps organizations find the right companies, understand why they matter, verify whether action is safe, and decide what to do next.",
    "hero.primary": "Open app",
    "hero.secondary": "View system architecture",
    "hero.tertiary": "Constitutional Layer",
    "status.currentTitle": "Current status",
    "status.currentBody":
      "The PWA shell and core modules are live. Realtime, CRM, compliance, and governance surfaces are being connected progressively into the production operating model.",
    "status.currentCta": "View current sprint",
    "nav.home": "Home",
    "nav.app": "App",
    "nav.docs": "Docs",
    "nav.pricing": "Pricing",
    "app.header.subtitle": "Operational shell for intelligence and decisions",
    "app.hero.title": "CIOS App",
    "app.hero.subtitle":
      "This app shell connects directly to the bootstrap and overview contracts from the Workers API.",
    "app.hero.back": "Back to homepage",
    "app.hero.docs": "View docs",
    "app.bootstrap.title": "Bootstrap",
    "app.bootstrap.loading": "Loading bootstrap...",
    "app.overview.title": "Overview",
    "app.overview.loading": "Loading overview...",
    "app.system.title": "System",
    "app.system.loading": "Loading system status...",
    "app.demo.title": "Demo connection",
    "app.demo.copy":
      "Without a bearer token, the app shell runs on the public demo bootstrap from the Workers API.",
    "app.demo.api": "Workers API base",
    "app.demo.token": "Bearer token",
    "app.demo.connect": "Connect",
    "app.demo.clear": "Clear token",
    "app.surface.crm": "CRM Surface",
    "app.surface.governance": "Governance",
    "app.surface.reasonCodes": "Reason codes",
    "pricing.title": "Choose how CIOS works for you.",
    "pricing.subtitle":
      "From quick testing to running your full customer intelligence operating model, CIOS scales with what you actually need.",
    "pricing.cta.free": "Start free",
    "pricing.cta.pro": "Start Pro",
    "pricing.cta.business": "Upgrade to Business",
    "pricing.cta.enterprise": "Contact sales",
    "deck.title": "Enterprise Sales Deck",
    "deck.subtitle": "A $50k - $500k close-focused deck, ready for PDF export.",
    "home.panel.topAccounts.loading": "Loading top accounts today...",
    "home.panel.safeActions.loading": "Loading safe action status...",
    "home.panel.pendingReviews.loading": "Loading review queue...",
    "home.panel.workflow.loading": "Loading workflow status...",
    "home.panel.topAccounts.empty": "Top accounts today: no data yet",
    "home.panel.safeActions.empty": "Safe actions: no active decisions",
    "home.panel.pendingReviews.empty": "Pending reviews: no queue items",
    "home.panel.workflow.empty": "Workflow callbacks: no recent events",
    "home.panel.topAccounts.fallback":
      "Top accounts today: foundation is live, data surfaces are connecting",
    "home.panel.safeActions.fallback":
      "Safe actions: the policy layer is online",
    "home.panel.pendingReviews.fallback":
      "Pending reviews: queue is loading from live APIs",
    "home.panel.workflow.fallback":
      "Workflow callbacks: execution feedback is connecting",
    "app.auth.public": "Public demo access",
    "app.auth.private": "Connected with bearer token",
    "app.auth.saved": "API base and token saved locally.",
    "app.auth.cleared":
      "Local token cleared. The app is back to public demo mode.",
    "app.auth.error": "Could not load bootstrap/overview from the Workers API.",
  },
};

function getStoredLanguage() {
  return localStorage.getItem(LANG_KEY) === "en" ? "en" : "vi";
}

function setStoredLanguage(language) {
  localStorage.setItem(LANG_KEY, language);
}

function t(key, language = getStoredLanguage()) {
  return translations[language]?.[key] ?? translations.vi[key] ?? key;
}

function applyTranslations(root = document, language = getStoredLanguage()) {
  document.documentElement.lang = language;
  root.querySelectorAll("[data-i18n-vi][data-i18n-en]").forEach((node) => {
    const vi = node.getAttribute("data-i18n-vi") || "";
    const en = node.getAttribute("data-i18n-en") || "";
    node.textContent = language === "en" ? en : vi;
  });
  root
    .querySelectorAll("[data-i18n-placeholder-vi][data-i18n-placeholder-en]")
    .forEach((node) => {
      if (
        !(
          node instanceof HTMLInputElement ||
          node instanceof HTMLTextAreaElement
        )
      )
        return;
      const vi = node.getAttribute("data-i18n-placeholder-vi") || "";
      const en = node.getAttribute("data-i18n-placeholder-en") || "";
      node.placeholder = language === "en" ? en : vi;
    });
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) return;
    node.textContent = t(key, language);
  });
  const toggle = root.querySelector("[data-language-toggle]");
  if (toggle) {
    toggle.textContent = language === "vi" ? "🇻🇳 Tiếng Việt" : "🇺🇸 English";
    toggle.setAttribute(
      "aria-label",
      language === "vi"
        ? "Chuyển sang tiếng Anh / Switch to English"
        : "Chuyển sang tiếng Việt / Switch to Vietnamese",
    );
  }
}

function installLanguageToggle(root = document) {
  const toggle = root.querySelector("[data-language-toggle]");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const next = getStoredLanguage() === "vi" ? "en" : "vi";
    setStoredLanguage(next);
    applyTranslations(document, next);
    if (document.body.dataset.page === "home") {
      void loadHomepageStatus();
    }
  });
}

function getApiBase() {
  return localStorage.getItem(API_BASE_KEY) || DEFAULT_API_BASE;
}

function setApiBase(value) {
  localStorage.setItem(API_BASE_KEY, value || DEFAULT_API_BASE);
}

function getWorkerToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setWorkerToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { cache: "no-store", ...options });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

async function fetchWorkersJson(path) {
  const token = getWorkerToken();
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return fetchJson(`${getApiBase()}${path}`, { headers, mode: "cors" });
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.textContent = value;
}

function setNodeText(node, value) {
  if (node) node.textContent = value;
}

function formatInt(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat(
    getStoredLanguage() === "vi" ? "vi-VN" : "en-US",
  ).format(value);
}

function summarizeTopAccounts(orgs) {
  const language = getStoredLanguage();
  if (!orgs.length) return t("home.panel.topAccounts.empty", language);
  const top = orgs
    .slice(0, 3)
    .map(
      (item) =>
        item.name ||
        item.domain ||
        item.id ||
        (language === "vi" ? "tài khoản" : "account"),
    );
  return language === "vi"
    ? `Tài khoản nổi bật hôm nay: ${top.join(" · ")}`
    : `Top accounts today: ${top.join(" · ")}`;
}

function summarizeSafeActions(decisions) {
  const language = getStoredLanguage();
  if (!decisions.length) return t("home.panel.safeActions.empty", language);
  const allowCount = decisions.filter((item) => {
    const value = String(
      item?.decision || item?.sourceGovernanceState || "",
    ).toLowerCase();
    return (
      value === "allow" ||
      value === "allowed" ||
      value === "allowed_with_limits"
    );
  }).length;
  return language === "vi"
    ? `Hành động an toàn: ${formatInt(allowCount)} mục được phép`
    : `Safe actions: ${formatInt(allowCount)} allowed`;
}

function summarizePendingReviews(reviews) {
  const language = getStoredLanguage();
  if (!reviews.length) return t("home.panel.pendingReviews.empty", language);
  return language === "vi"
    ? `Mục chờ duyệt: ${formatInt(reviews.length)}`
    : `Pending reviews: ${formatInt(reviews.length)}`;
}

function summarizeWorkflowCallbacks(logs) {
  const language = getStoredLanguage();
  if (!logs.length) return t("home.panel.workflow.empty", language);
  const success = logs.filter(
    (item) => String(item?.status || "").toLowerCase() === "success",
  ).length;
  return language === "vi"
    ? `Workflow callback: ${formatInt(success)} lần thành công`
    : `Workflow callbacks: ${formatInt(success)} success`;
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

export async function loadHomepageStatus() {
  try {
    const overviewEnvelope = await fetchWorkersJson("/v1/overview");
    const data = overviewEnvelope.data ?? {};
    setText(
      "[data-top-accounts]",
      summarizeTopAccounts(data.crm?.topOrganizations ?? []),
    );
    setText(
      "[data-safe-actions]",
      summarizeSafeActions(data.discovery?.recentGovernance ?? []),
    );
    setText(
      "[data-pending-reviews]",
      summarizePendingReviews(data.decision?.pendingReviews ?? []),
    );
    setText(
      "[data-workflow-callbacks]",
      summarizeWorkflowCallbacks(data.realtime?.recentEvents ?? []),
    );
  } catch {
    const language = getStoredLanguage();
    setText(
      "[data-top-accounts]",
      t("home.panel.topAccounts.fallback", language),
    );
    setText(
      "[data-safe-actions]",
      t("home.panel.safeActions.fallback", language),
    );
    setText(
      "[data-pending-reviews]",
      t("home.panel.pendingReviews.fallback", language),
    );
    setText(
      "[data-workflow-callbacks]",
      t("home.panel.workflow.fallback", language),
    );
  }
}

function renderBootstrap(data) {
  setText(
    "[data-bootstrap-auth]",
    data.auth?.authenticated ? t("app.auth.private") : t("app.auth.public"),
  );
  setText(
    "[data-bootstrap-user]",
    `${data.user?.name ?? "--"} · ${data.user?.role ?? "--"}`,
  );
  setText(
    "[data-bootstrap-workspace]",
    `${data.workspace?.name ?? data.workspace?.code ?? "--"}`,
  );
}

function renderOverview(data) {
  setText(
    "[data-overview-crm]",
    `${formatInt(data.crm?.organizationsTotal ?? 0)} organizations`,
  );
  setText(
    "[data-overview-compliance]",
    `${formatInt(data.compliance?.auditTotal ?? 0)} audit entries`,
  );
  setText(
    "[data-overview-decision]",
    `${formatInt(data.decision?.pendingReviewTotal ?? 0)} pending reviews`,
  );
  setText(
    "[data-overview-system]",
    `${formatInt(data.system?.throughputPerMin ?? 0)} events/min · ${formatInt(data.system?.queueDepth ?? 0)} queue depth`,
  );
  setText(
    "[data-overview-realtime]",
    `${formatInt(data.realtime?.recentEvents?.length ?? 0)} recent events`,
  );
  const topOrg = data.crm?.topOrganizations?.[0];
  setText(
    "[data-overview-top-orgs]",
    topOrg ? `${topOrg.name} · fit ${topOrg.fitScore}` : "--",
  );
  const governance = data.discovery?.recentGovernance?.[0];
  setText(
    "[data-overview-governance]",
    governance
      ? `${governance.domain} · ${governance.sourceGovernanceState}`
      : "--",
  );
  const reasonCodes = data.decision?.reasonCodeCatalog
    ?.slice(0, 3)
    .map((item) => item.code)
    .join(", ");
  setText("[data-overview-reason-codes]", reasonCodes || "--");
}

export async function initAppShell() {
  document.body.dataset.page = "app";
  applyTranslations(document);
  installLanguageToggle(document);
  await loadVersionBadge();

  const form = document.querySelector("[data-auth-form]");
  const feedback = document.querySelector("[data-auth-feedback]");
  const clearBtn = document.querySelector("[data-clear-auth]");

  if (form instanceof HTMLFormElement) {
    const apiBaseInput = form.elements.namedItem("apiBase");
    const tokenInput = form.elements.namedItem("token");
    if (apiBaseInput instanceof HTMLInputElement)
      apiBaseInput.value = getApiBase();
    if (tokenInput instanceof HTMLTextAreaElement)
      tokenInput.value = getWorkerToken();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      setApiBase(String(formData.get("apiBase") || DEFAULT_API_BASE));
      setWorkerToken(String(formData.get("token") || "").trim());
      if (feedback) feedback.textContent = t("app.auth.saved");
      await loadAppRuntime();
    });
  }

  clearBtn?.addEventListener("click", async () => {
    setWorkerToken("");
    if (form instanceof HTMLFormElement) {
      const tokenInput = form.elements.namedItem("token");
      if (tokenInput instanceof HTMLTextAreaElement) tokenInput.value = "";
    }
    if (feedback) feedback.textContent = t("app.auth.cleared");
    await loadAppRuntime();
  });

  await loadAppRuntime();
}

export function initLanguageOnlyPage() {
  applyTranslations(document);
  installLanguageToggle(document);
  void loadVersionBadge();
}

async function loadAppRuntime() {
  try {
    const [bootstrapEnvelope, overviewEnvelope] = await Promise.all([
      fetchWorkersJson("/v1/bootstrap"),
      fetchWorkersJson("/v1/overview"),
    ]);
    renderBootstrap(bootstrapEnvelope.data ?? {});
    renderOverview(overviewEnvelope.data ?? {});
  } catch {
    const feedback = document.querySelector("[data-auth-feedback]");
    if (feedback) feedback.textContent = t("app.auth.error");
  }
}

if (typeof window !== "undefined") {
  window.CIOS = {
    registerFeature,
    mountFeature,
    loadVersionBadge,
    loadHomepageStatus,
    initAppShell,
  };

  window.addEventListener("DOMContentLoaded", () => {
    applyTranslations(document);
    installLanguageToggle(document);
  });
}
