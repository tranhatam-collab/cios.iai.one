import {
  requireAuth,
  requireRole,
  type AuthContext,
  type Role,
} from "./lib/auth";
import {
  validateDataQueryPayload,
  validateEventSearchFilters,
  validateFlowCallbackPayload,
  validateFlowDispatchPayload,
  validateGovernanceApprovalPayload,
  validateIngestPayload,
  validateSimulationRunPayload,
} from "./lib/contracts";
import { corsHeaders, fail, makeTraceId, ok } from "./lib/envelope";
import { listAudit, writeAudit } from "./lib/audit";
import {
  getSystemMetrics,
  runDataQuery,
  searchEvents,
  listFlowLogs,
  listHourlyReports,
  storeFlowLog,
  storeIngestEvent,
} from "./lib/domain-store";
import { enforceIdempotency } from "./lib/idempotency";
import type { WorkerEnv } from "./lib/persistence";
import { enforceRateLimit } from "./lib/rate-limit";
import { verifyFlowSignature } from "./lib/signature";
import { parseJsonBody } from "./lib/validation";

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function readListQuery(url: URL): {
  page: number;
  pageSize: number;
  from: string | null;
  to: string | null;
  sortBy: string;
  sortOrder: "asc" | "desc";
} {
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const pageSize = Math.min(
    parsePositiveInt(url.searchParams.get("page_size"), 20),
    100,
  );
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const sortBy = url.searchParams.get("sort_by") ?? "created_at";
  const sortOrder =
    url.searchParams.get("sort_order") === "asc" ? "asc" : "desc";
  return { page, pageSize, from, to, sortBy, sortOrder };
}

async function handleSystemState(traceId: string): Promise<Response> {
  return ok(
    {
      status: "operational",
      trust_index: 72,
      stress_index: 41,
      risk_level: "medium",
    },
    { contract: "phase2-workers-v1" },
    traceId,
  );
}

async function handleSystemHealth(traceId: string): Promise<Response> {
  return ok(
    {
      service: "cios-workers-api",
      status: "healthy",
      contract: "phase2-workers-v1",
    },
    {},
    traceId,
  );
}

async function handleSystemMetrics(
  traceId: string,
  env: WorkerEnv,
  from: string | null,
  to: string | null,
): Promise<Response> {
  const metrics = await getSystemMetrics({ from, to }, env);
  return ok(
    {
      throughput_per_min: metrics.throughputPerMin,
      active_incidents: metrics.activeIncidents,
      anomaly_count: metrics.anomalyCount,
      queue_depth: metrics.queueDepth,
    },
    { source: env.CIOS_DB ? "d1-aggregated" : "fallback-aggregated", from, to },
    traceId,
  );
}


async function authorize(
  request: Request,
  traceId: string,
  env: WorkerEnv,
  minRole: Role,
  route: string,
  action: string,
): Promise<AuthContext | Response> {
  const auth = await requireAuth(request, traceId, env);
  if (auth instanceof Response) {
    await writeAudit(
      {
        at: new Date().toISOString(),
        route,
        action,
        actor: "anonymous",
        role: "observer",
        result: "failed",
        traceId,
        details: { reason: "unauthorized", status: auth.status },
      },
      env,
    );
    return auth;
  }

  const roleOk = requireRole(auth, minRole, traceId);
  if (roleOk instanceof Response) {
    await writeAudit(
      {
        at: new Date().toISOString(),
        route,
        action,
        actor: auth.subject,
        role: auth.role,
        result: "failed",
        traceId,
        details: {
          reason: "forbidden",
          required_role: minRole,
          status: roleOk.status,
        },
      },
      env,
    );
    return roleOk;
  }

  return auth;
}

const workerNavByRole: Record<Role, string[]> = {
  observer: ["overview", "intelligence", "pricing"],
  operator: ["overview", "intelligence", "crm", "workflow"],
  governor: ["overview", "crm", "compliance", "decision", "workflow"],
  root: ["overview", "crm", "compliance", "decision", "workflow", "settings"],
};

const workerModuleFlags = {
  overview: true,
  intelligenceSearch: true,
  crmSurface: true,
  complianceCenter: true,
  decisionCenter: true,
  workflowConnect: true,
  realtimeStream: true,
  constitutionalLayer: true,
};

const workerReasonCodeCatalog = [
  {
    code: "deletion_pending",
    category: "data_lifecycle",
    meaning: "Record has a pending deletion workflow.",
  },
  {
    code: "suppression_active",
    category: "compliance",
    meaning: "Record is currently suppressed.",
  },
  {
    code: "source_blocked",
    category: "governance",
    meaning: "The source is blocked by governance policy.",
  },
  {
    code: "record_compliance_blocked",
    category: "compliance",
    meaning: "The record is blocked by compliance state.",
  },
  {
    code: "traceability_unsupported",
    category: "traceability",
    meaning: "Traceability requirements are not satisfied.",
  },
  {
    code: "review_pending",
    category: "review",
    meaning: "The action is already waiting for review.",
  },
  {
    code: "action_class_manual_required",
    category: "policy",
    meaning: "The action class requires manual approval.",
  },
  {
    code: "borderline_confidence_or_inferred",
    category: "trust",
    meaning: "Confidence or traceability is too weak for direct action.",
  },
  {
    code: "high_sensitivity_or_restricted_source",
    category: "governance",
    meaning: "High sensitivity or restricted source requires review.",
  },
  {
    code: "all_checks_passed",
    category: "allow",
    meaning: "The action passed baseline constitutional checks.",
  },
] as const;

function mapUiRole(role: Role): string {
  if (role === "root") return "owner";
  if (role === "governor") return "compliance_admin";
  if (role === "operator") return "sales_rep";
  return "readonly";
}

function getPermissionsForRole(role: Role): string[] {
  if (role === "root") {
    return [
      "bootstrap.read",
      "overview.read",
      "crm.organizations.read",
      "compliance.audit.read",
      "workflow.dispatch",
      "governance.audit.read",
    ];
  }
  if (role === "governor") {
    return [
      "bootstrap.read",
      "overview.read",
      "crm.organizations.read",
      "compliance.audit.read",
      "workflow.dispatch",
    ];
  }
  if (role === "operator") {
    return [
      "bootstrap.read",
      "overview.read",
      "crm.organizations.read",
      "workflow.dispatch",
    ];
  }
  return ["bootstrap.read", "overview.read"];
}

type ViewerContext = {
  authenticated: boolean;
  source: "public_demo" | "bearer";
  role: Role;
  subject: string;
  claims: Record<string, unknown>;
};

async function resolveViewer(
  request: Request,
  traceId: string,
  env: WorkerEnv,
): Promise<ViewerContext | Response> {
  if (!request.headers.get("authorization")) {
    return {
      authenticated: false,
      source: "public_demo",
      role: "observer",
      subject: "public-demo",
      claims: {
        sub: "public-demo",
        userId: "public-demo",
        workspaceId: "demo-workspace",
        workspaceCode: "demo",
        email: "demo@cios.local",
        name: "Public Demo",
        plan: "demo",
      },
    };
  }

  const auth = await requireAuth(request, traceId, env);
  if (auth instanceof Response) return auth;

  return {
    authenticated: true,
    source: "bearer",
    role: auth.role,
    subject: auth.subject,
    claims: auth.claims,
  };
}

function viewerStringClaim(
  viewer: ViewerContext,
  key: string,
  fallback: string,
): string {
  const value = viewer.claims[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildBootstrapPayload(viewer: ViewerContext, env: WorkerEnv) {
  const uiRole = mapUiRole(viewer.role);
  return {
    user: {
      id: viewerStringClaim(viewer, "userId", viewer.subject),
      email: viewerStringClaim(viewer, "email", "demo@cios.local"),
      name: viewerStringClaim(
        viewer,
        "name",
        viewer.authenticated ? "Authenticated User" : "Public Demo",
      ),
      role: uiRole,
      plan: viewerStringClaim(
        viewer,
        "plan",
        viewer.authenticated ? "business" : "demo",
      ),
    },
    workspace: {
      id: viewerStringClaim(viewer, "workspaceId", "demo-workspace"),
      code: viewerStringClaim(viewer, "workspaceCode", "demo"),
      name: viewer.authenticated
        ? "Authenticated Workspace"
        : "CIOS Demo Workspace",
    },
    auth: {
      authenticated: viewer.authenticated,
      source: viewer.source,
      token_required_for_write: true,
      login_hint:
        "Use a valid bearer token to unlock role-aware write surfaces.",
    },
    context: {
      apiCompat: env.API_CONTRACT ?? "phase2-workers-v1",
      version: env.API_CONTRACT ?? "phase2-workers-v1",
      environment: "cloudflare-workers",
      constitutionalMode: "enforced",
      constitutionalLayerVersion: "phase0-day7-workers",
    },
    permissions: getPermissionsForRole(viewer.role),
    nav: workerNavByRole[viewer.role],
    modules: workerModuleFlags,
    constitutional: {
      actions: {
        flowDispatch: {
          requiresPolicyCheck: true,
          route: "/v1/flow/dispatch",
          decisions: ["allow", "deny", "review_required"],
        },
      },
      reasonCodes: workerReasonCodeCatalog,
    },
    uiStateContracts: {
      disabledStates: [
        {
          key: "flow.dispatch.disabled",
          whenAnyReasonCodes: [
            "deletion_pending",
            "suppression_active",
            "source_blocked",
            "record_compliance_blocked",
            "traceability_unsupported",
          ],
        },
      ],
      reviewStates: [
        {
          key: "flow.dispatch.review_required",
          whenAnyReasonCodes: [
            "review_pending",
            "action_class_manual_required",
            "borderline_confidence_or_inferred",
            "high_sensitivity_or_restricted_source",
          ],
        },
      ],
    },
  };
}

async function handleBootstrap(
  request: Request,
  traceId: string,
  env: WorkerEnv,
): Promise<Response> {
  const viewer = await resolveViewer(request, traceId, env);
  if (viewer instanceof Response) return viewer;
  return ok(
    buildBootstrapPayload(viewer, env),
    { source: viewer.source },
    traceId,
  );
}

async function handleOverview(
  request: Request,
  traceId: string,
  env: WorkerEnv,
): Promise<Response> {
  const viewer = await resolveViewer(request, traceId, env);
  if (viewer instanceof Response) return viewer;

  const [metrics, recentAudit, flowLogs, events] = await Promise.all([
    getSystemMetrics({ from: null, to: null }, env),
    listAudit(8, env),
    listFlowLogs({ page: 1, pageSize: 8, from: null, to: null }, env),
    searchEvents(
      {
        page: 1,
        pageSize: 8,
        from: null,
        to: null,
        text: null,
        source: null,
        eventType: null,
        sortOrder: "desc",
      },
      env,
    ),
  ]);

  const topOrganizations = [
    {
      id: "org_demo_001",
      name: "Northstar Robotics",
      industry: "Industrial AI",
      fitScore: 92,
      intentScore: 81,
      stage: "qualified",
      owner: "demo-owner",
    },
    {
      id: "org_demo_002",
      name: "Halo Biotech",
      industry: "Healthcare",
      fitScore: 88,
      intentScore: 76,
      stage: "new",
      owner: "demo-owner",
    },
    {
      id: "org_demo_003",
      name: "Atlas Logistics Cloud",
      industry: "Supply Chain",
      fitScore: 84,
      intentScore: 74,
      stage: "proposal",
      owner: "demo-owner",
    },
  ];

  const recentQueue = (events.length ? events : topOrganizations)
    .slice(0, 5)
    .map((item, index) => ({
      id: "id" in item ? item.id : `queue_demo_${index + 1}`,
      domain:
        "source" in item
          ? `${item.source}.example`
          : `${item.name.toLowerCase().replace(/\s+/g, "-")}.example`,
      signal: "eventType" in item ? item.eventType : "market.signal.detected",
      freshness:
        "occurredAt" in item ? item.occurredAt : new Date().toISOString(),
      riskLevel:
        "eventType" in item && item.eventType.toLowerCase().includes("risk")
          ? "high"
          : "medium",
      sourceGovernanceState:
        index % 3 === 0
          ? "review_required"
          : index % 2 === 0
            ? "allowed_with_limits"
            : "allowed",
    }));

  const recentGovernance = (recentAudit.length ? recentAudit : flowLogs)
    .slice(0, 5)
    .map((item, index) => ({
      id: `gov_${index + 1}`,
      domain:
        "actor" in item && item.actor.includes("@")
          ? item.actor.split("@")[1]
          : `governance-${index + 1}.example`,
      sourceGovernanceState:
        "result" in item && item.result === "failed"
          ? "review_required"
          : "allowed_with_limits",
      summary:
        "action" in item
          ? `${item.action} ${item.result === "failed" ? "requires review" : "cleared"}`
          : `${item.triggerName} ${item.status}`,
      decidedAt: "at" in item ? item.at : item.completedAt,
    }));

  const pendingReviews = recentGovernance
    .filter((item) => item.sourceGovernanceState === "review_required")
    .slice(0, 3)
    .map((item, index) => ({
      id: `review_${index + 1}`,
      reviewType: "constitutional_review",
      resolutionStatus: "pending",
      targetObjectId: item.domain,
      reasonCodes: ["high_sensitivity_or_restricted_source"],
      requiredApprovals: 1,
    }));

  return ok(
    {
      snapshotAt: new Date().toISOString(),
      workspace: {
        id: viewerStringClaim(viewer, "workspaceId", "demo-workspace"),
        code: viewerStringClaim(viewer, "workspaceCode", "demo"),
      },
      auth: {
        authenticated: viewer.authenticated,
        source: viewer.source,
      },
      crm: {
        organizationsTotal: topOrganizations.length,
        topOrganizations,
      },
      compliance: {
        auditTotal: recentAudit.length,
        recentAudit: recentAudit.slice(0, 5),
        retentionRuleTotal: 3,
        retentionRules: [
          {
            id: "ret_001",
            scope: "crm_record",
            retentionDays: 365,
            action: "review_then_delete",
          },
          {
            id: "ret_002",
            scope: "audit_log",
            retentionDays: 730,
            action: "archive",
          },
          {
            id: "ret_003",
            scope: "suppression_event",
            retentionDays: 1095,
            action: "retain",
          },
        ],
      },
      discovery: {
        queueTotal: recentQueue.length,
        governanceDecisionTotal: recentGovernance.length,
        recentQueue,
        recentGovernance,
      },
      decision: {
        pendingReviewTotal: pendingReviews.length,
        pendingReviews,
        reasonCodeCatalog: workerReasonCodeCatalog,
        ui: {
          disableActionReasonCodes: [
            "deletion_pending",
            "suppression_active",
            "source_blocked",
            "record_compliance_blocked",
            "traceability_unsupported",
          ],
          reviewRequiredReasonCodes: [
            "review_pending",
            "action_class_manual_required",
            "borderline_confidence_or_inferred",
            "high_sensitivity_or_restricted_source",
          ],
        },
      },
      realtime: {
        streamPath: null,
        replayPath: null,
        recentEvents: events.slice(0, 5).map((event) => ({
          id: event.id,
          source: event.source,
          event_type: event.eventType,
          occurred_at: event.occurredAt,
        })),
        status: "available",
      },
      system: {
        throughputPerMin: metrics.throughputPerMin,
        activeIncidents: metrics.activeIncidents,
        anomalyCount: metrics.anomalyCount,
        queueDepth: metrics.queueDepth,
        flowLogCount: flowLogs.length,
      },
      status: {
        degradedMode: !env.CIOS_DB,
        apiUnavailable: false,
        constitutionalReviewEnabled: true,
      },
    },
    { source: viewer.source },
    traceId,
  );
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const traceId = request.headers.get("x-trace-id") ?? makeTraceId();
    const method = request.method.toUpperCase();
    const path = url.pathname;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (method === "GET" && path === "/v1/bootstrap") {
      return handleBootstrap(request, traceId, env);
    }

    if (method === "GET" && path === "/v1/overview") {
      return handleOverview(request, traceId, env);
    }

    if (method === "GET" && path === "/v1/system/state") {
      return handleSystemState(traceId);
    }

    if (method === "GET" && path === "/v1/system/health") {
      return handleSystemHealth(traceId);
    }

    if (method === "GET" && path === "/v1/system/metrics") {
      const q = readListQuery(url);
      return handleSystemMetrics(traceId, env, q.from, q.to);
    }

    if (method === "POST" && path === "/v1/events/ingest") {
      const auth = await authorize(
        request,
        traceId,
        env,
        "operator",
        path,
        "event_ingest",
      );
      if (auth instanceof Response) return auth;
      const rate = enforceRateLimit(
        `${path}:${auth.subject}:${auth.role}`,
        30,
        60_000,
        traceId,
      );
      if (rate instanceof Response) return rate;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["source", "event_type", "occurred_at", "payload"],
        traceId,
      );
      if ("response" in parsed) return parsed.response;
      const validated = validateIngestPayload(parsed.value, traceId);
      if ("response" in validated) return validated.response;
      const idem = await enforceIdempotency(
        request,
        path,
        validated.value,
        traceId,
        env,
      );
      if (idem instanceof Response) return idem;
      const eventRow = await storeIngestEvent(
        {
          source: validated.value.source,
          eventType: validated.value.eventType,
          occurredAt: validated.value.occurredAt,
          payload: {
            payload: validated.value.payload,
            entity_refs: validated.value.entityRefs,
          },
          traceId,
        },
        env,
      );
      await writeAudit(
        {
          at: new Date().toISOString(),
          route: path,
          action: "event_ingest",
          actor: auth.subject,
          role: auth.role,
          result: "success",
          traceId,
        },
        env,
      );
      return ok(
        { accepted: true, route: path, event_id: eventRow.id },
        {
          phase: "workers-contract",
          status: env.CIOS_DB ? "d1-persisted" : "fallback-persisted",
        },
        traceId,
      );
    }

    if (method === "GET" && path === "/v1/events/search") {
      const auth = await authorize(
        request,
        traceId,
        env,
        "observer",
        path,
        "events_search",
      );
      if (auth instanceof Response) return auth;
      const q = readListQuery(url);
      const filters = validateEventSearchFilters({
        text: url.searchParams.get("q"),
        source: url.searchParams.get("source"),
        eventType: url.searchParams.get("event_type"),
        from: q.from,
        to: q.to,
      });
      const rows = await searchEvents(
        {
          page: q.page,
          pageSize: q.pageSize,
          from: filters.from,
          to: filters.to,
          text: filters.text,
          source: filters.source,
          eventType: filters.eventType,
          sortOrder: q.sortOrder,
        },
        env,
      );
      return ok(
        rows.map((row) => ({
          id: row.id,
          source: row.source,
          event_type: row.eventType,
          occurred_at: row.occurredAt,
          trace_id: row.traceId,
          payload: row.payload,
        })),
        {
          pagination: { page: q.page, page_size: q.pageSize },
          filters,
          source: env.CIOS_DB ? "d1-search" : "fallback-search",
        },
        traceId,
      );
    }

    if (method === "POST" && path === "/v1/simulations/run") {
      const auth = await authorize(
        request,
        traceId,
        env,
        "operator",
        path,
        "simulation_run",
      );
      if (auth instanceof Response) return auth;
      const rate = enforceRateLimit(
        `${path}:${auth.subject}:${auth.role}`,
        20,
        60_000,
        traceId,
      );
      if (rate instanceof Response) return rate;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["scenario_name", "base_state_ref", "input_parameters", "time_horizon"],
        traceId,
      );
      if ("response" in parsed) return parsed.response;
      const validated = validateSimulationRunPayload(parsed.value, traceId);
      if ("response" in validated) return validated.response;
      await writeAudit(
        {
          at: new Date().toISOString(),
          route: path,
          action: "simulation_run",
          actor: auth.subject,
          role: auth.role,
          result: "success",
          traceId,
        },
        env,
      );
      return ok(
        {
          simulation_id: crypto.randomUUID(),
          status: "queued",
          scenario_name: validated.value.scenarioName,
          base_state_ref: validated.value.baseStateRef,
        },
        { phase: "workers-contract", status: "stubbed" },
        traceId,
      );
    }

    if (method === "POST" && path === "/v1/governance/approvals") {
      const auth = await authorize(
        request,
        traceId,
        env,
        "governor",
        path,
        "governance_approval",
      );
      if (auth instanceof Response) return auth;
      const rate = enforceRateLimit(
        `${path}:${auth.subject}:${auth.role}`,
        10,
        60_000,
        traceId,
      );
      if (rate instanceof Response) return rate;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["request_id", "decision", "reason"],
        traceId,
      );
      if ("response" in parsed) return parsed.response;
      const validated = validateGovernanceApprovalPayload(
        parsed.value,
        traceId,
      );
      if ("response" in validated) return validated.response;
      await writeAudit(
        {
          at: new Date().toISOString(),
          route: path,
          action: "governance_approval",
          actor: auth.subject,
          role: auth.role,
          result: "success",
          traceId,
        },
        env,
      );
      return ok(
        {
          approved: validated.value.decision === "approve",
          route: path,
          decision_id: crypto.randomUUID(),
          request_id: validated.value.requestId,
        },
        { phase: "workers-contract", status: "stubbed" },
        traceId,
      );
    }

    if (method === "POST" && path === "/v1/flow/dispatch") {
      const auth = await authorize(
        request,
        traceId,
        env,
        "governor",
        path,
        "flow_dispatch",
      );
      if (auth instanceof Response) return auth;
      const rate = enforceRateLimit(
        `${path}:${auth.subject}:${auth.role}`,
        10,
        60_000,
        traceId,
      );
      if (rate instanceof Response) return rate;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        [
          "trigger_name",
          "source_decision_id",
          "payload",
          "priority",
          "expected_callback",
          "requested_by",
        ],
        traceId,
      );
      if ("response" in parsed) return parsed.response;
      const validated = validateFlowDispatchPayload(parsed.value, traceId);
      if ("response" in validated) return validated.response;
      const idem = await enforceIdempotency(
        request,
        path,
        validated.value,
        traceId,
        env,
      );
      if (idem instanceof Response) return idem;
      const flowRunId = crypto.randomUUID();
      await storeFlowLog(
        {
          flowRunId,
          triggerName: validated.value.triggerName,
          status: "accepted",
          completedAt: new Date().toISOString(),
          traceId,
          payload: validated.value.payload,
        },
        env,
      );
      await writeAudit(
        {
          at: new Date().toISOString(),
          route: path,
          action: "flow_dispatch",
          actor: auth.subject,
          role: auth.role,
          result: "success",
          traceId,
        },
        env,
      );
      return ok(
        { flow_dispatch_id: flowRunId, status: "accepted" },
        {
          phase: "workers-contract",
          status: env.CIOS_DB ? "d1-persisted" : "fallback-persisted",
        },
        traceId,
      );
    }

    if (method === "POST" && path === "/v1/data/query") {
      const auth = await authorize(
        request,
        traceId,
        env,
        "operator",
        path,
        "data_query",
      );
      if (auth instanceof Response) return auth;
      const rate = enforceRateLimit(
        `${path}:${auth.subject}:${auth.role}`,
        25,
        60_000,
        traceId,
      );
      if (rate instanceof Response) return rate;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["dimensions", "metrics"],
        traceId,
      );
      if ("response" in parsed) return parsed.response;
      const validated = validateDataQueryPayload(parsed.value, traceId);
      if ("response" in validated) return validated.response;

      const rows = await runDataQuery(validated.value, env);
      await writeAudit(
        {
          at: new Date().toISOString(),
          route: path,
          action: "data_query",
          actor: auth.subject,
          role: auth.role,
          result: "success",
          traceId,
          details: {
            dimensions: validated.value.dimensions,
            metrics: validated.value.metrics,
            time_slice: validated.value.timeSlice,
          },
        },
        env,
      );

      return ok(
        rows,
        {
          source: env.CIOS_DB ? "d1-query" : "fallback-query",
          query: {
            dimensions: validated.value.dimensions,
            metrics: validated.value.metrics,
            time_slice: validated.value.timeSlice,
            limit: validated.value.limit,
          },
        },
        traceId,
      );
    }

    if (method === "POST" && path === "/v1/flow/callback") {
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["flow_run_id", "trigger_name", "status", "completed_at", "trace_id"],
        traceId,
      );
      if ("response" in parsed) return parsed.response;
      const sig = await verifyFlowSignature(
        parsed.value,
        request,
        traceId,
        env.FLOW_WEBHOOK_SECRET,
      );
      if (sig instanceof Response) {
        await writeAudit(
          {
            at: new Date().toISOString(),
            route: path,
            action: "flow_callback",
            actor: "flow-system",
            role: "operator",
            result: "failed",
            traceId,
            details: { reason: "invalid_signature" },
          },
          env,
        );
        return sig;
      }
      const validated = validateFlowCallbackPayload(parsed.value, traceId);
      if ("response" in validated) return validated.response;
      await storeFlowLog(
        {
          flowRunId: validated.value.flowRunId,
          triggerName: validated.value.triggerName,
          status: validated.value.status,
          completedAt: validated.value.completedAt,
          traceId: validated.value.callbackTraceId,
          payload: validated.value,
        },
        env,
      );
      await writeAudit(
        {
          at: new Date().toISOString(),
          route: path,
          action: "flow_callback",
          actor: "flow-system",
          role: "operator",
          result: "success",
          traceId,
        },
        env,
      );
      return ok(
        { callback_processed: true, flow_run_id: validated.value.flowRunId },
        { phase: "workers-contract", status: "stubbed" },
        traceId,
      );
    }

    if (method === "GET" && path === "/v1/governance/audit") {
      const auth = await authorize(
        request,
        traceId,
        env,
        "governor",
        path,
        "governance_audit_read",
      );
      if (auth instanceof Response) return auth;
      const entries = await listAudit(100, env);
      return ok(
        entries,
        {
          phase: "workers-contract",
          status: env.CIOS_DB ? "d1-audit" : "fallback-audit",
        },
        traceId,
      );
    }

    if (method === "GET" && path === "/v1/flow/logs") {
      const auth = await authorize(
        request,
        traceId,
        env,
        "governor",
        path,
        "flow_logs_read",
      );
      if (auth instanceof Response) return auth;
      const q = readListQuery(url);
      const logs = await listFlowLogs(
        {
          page: q.page,
          pageSize: q.pageSize,
          from: q.from,
          to: q.to,
        },
        env,
      );
      return ok(
        logs.map((row) => ({
          flow_run_id: row.flowRunId,
          trigger_name: row.triggerName,
          status: row.status,
          completed_at: row.completedAt,
          trace_id: row.traceId,
        })),
        {
          pagination: { page: q.page, page_size: q.pageSize },
          filters: { from: q.from, to: q.to },
        },
        traceId,
      );
    }

    if (method === "GET" && path === "/v1/reports/hourly") {
      const auth = await authorize(
        request,
        traceId,
        env,
        "observer",
        path,
        "reports_hourly_read",
      );
      if (auth instanceof Response) return auth;
      const q = readListQuery(url);
      const reports = await listHourlyReports(
        {
          page: q.page,
          pageSize: q.pageSize,
          from: q.from,
          to: q.to,
          sortOrder: q.sortOrder,
        },
        env,
      );
      return ok(
        reports.map((report) => ({
          report_id: report.reportId,
          generated_at: report.generatedAt,
          bucket_start: report.bucketStart,
          event_count: report.eventCount,
          risk_summary: report.riskSummary,
          anomaly_count: report.anomalyCount,
        })),
        {
          pagination: { page: q.page, page_size: q.pageSize },
          sort: { by: q.sortBy, order: q.sortOrder },
          source: env.CIOS_DB ? "d1-aggregated" : "fallback-aggregated",
        },
        traceId,
      );
    }

    return fail(
      404,
      "NOT_FOUND",
      "Route not found.",
      { method, path },
      traceId,
    );
  },
};
