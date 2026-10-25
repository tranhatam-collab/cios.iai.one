import { requireAuth, requireRole, type AuthContext, type Role } from "./lib/auth";
import {
  validateDataQueryPayload,
  validateEventSearchFilters,
  validateFlowCallbackPayload,
  validateFlowDispatchPayload,
  validateGovernanceApprovalPayload,
  validateIngestPayload,
  validateSimulationRunPayload
} from "./lib/contracts";
import { fail, makeTraceId, ok } from "./lib/envelope";
import { listAudit, writeAudit } from "./lib/audit";
import {
  getSystemMetrics,
  runDataQuery,
  searchEvents,
  listFlowLogs,
  listHourlyReports,
  storeFlowLog,
  storeIngestEvent
} from "./lib/domain-store";
import { enforceIdempotency } from "./lib/idempotency";
import type { WorkerEnv } from "./lib/persistence";
import { enforceRateLimit } from "./lib/rate-limit";
import { verifyFlowSignature } from "./lib/signature";
import { parseJsonBody } from "./lib/validation";
import { corsPreflight, withCors } from "./lib/cors";
import {
  handleAuthLogout,
  handleAuthMe,
  handleAuthRegister,
  handleAuthSession,
  handleMeta
} from "./lib/session-auth";
import {
  buildBootstrap,
  buildOverview,
  getOrganization,
  listComplianceAudit,
  listCrawlGovernance,
  listDiscoverySources,
  listOrganizations,
  listReviewQueue
} from "./lib/product-store";

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
  const pageSize = Math.min(parsePositiveInt(url.searchParams.get("page_size"), 20), 100);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const sortBy = url.searchParams.get("sort_by") ?? "created_at";
  const sortOrder = url.searchParams.get("sort_order") === "asc" ? "asc" : "desc";
  return { page, pageSize, from, to, sortBy, sortOrder };
}

async function handleSystemState(traceId: string): Promise<Response> {
  return ok(
    {
      status: "operational",
      trust_index: null,
      stress_index: null,
      risk_level: "unknown",
      note: "Live indices not wired; values intentionally null until telemetry feed exists."
    },
    { contract: "phase2-workers-v1", source: "uninstrumented" },
    traceId
  );
}

function workspaceFromAuth(auth: AuthContext): string {
  return String(auth.claims.workspaceCode ?? "demo");
}

async function handleSystemHealth(traceId: string): Promise<Response> {
  return ok(
    {
      service: "cios-workers-api",
      status: "healthy",
      contract: "phase2-workers-v1"
    },
    {},
    traceId
  );
}

async function handleSystemMetrics(
  traceId: string,
  env: WorkerEnv,
  from: string | null,
  to: string | null
): Promise<Response> {
  const metrics = await getSystemMetrics({ from, to }, env);
  return ok(
    {
      throughput_per_min: metrics.throughputPerMin,
      active_incidents: metrics.activeIncidents,
      anomaly_count: metrics.anomalyCount,
      queue_depth: metrics.queueDepth
    },
    { source: env.CIOS_DB ? "d1-aggregated" : "fallback-aggregated", from, to },
    traceId
  );
}

async function handleNotImplemented(route: string, traceId: string): Promise<Response> {
  return fail(
    501,
    "NOT_IMPLEMENTED",
    `Route ${route} is defined in contract but not implemented yet.`,
    undefined,
    traceId
  );
}

async function authorize(
  request: Request,
  traceId: string,
  env: WorkerEnv,
  minRole: Role,
  route: string,
  action: string
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
        details: { reason: "unauthorized", status: auth.status }
      },
      env
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
        details: { reason: "forbidden", required_role: minRole, status: roleOk.status }
      },
      env
    );
    return roleOk;
  }

  return auth;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const preflight = corsPreflight(request);
    if (preflight) return preflight;

    const response = await handleRequest(request, env);
    return withCors(response, request);
  }
};

async function handleRequest(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const traceId = request.headers.get("x-trace-id") ?? makeTraceId();
    const method = request.method.toUpperCase();
    const path = url.pathname;

    if (method === "GET" && path === "/health") {
      return handleSystemHealth(traceId);
    }

    if (method === "GET" && path === "/v1/meta") {
      return handleMeta(env, traceId);
    }

    if (method === "POST" && path === "/v1/auth/register") {
      const clientIp = request.headers.get("cf-connecting-ip") ?? "unknown";
      const rate = enforceRateLimit(`auth:register:${clientIp}`, 10, 60_000, traceId);
      if (rate instanceof Response) return rate;
      return handleAuthRegister(request, env, traceId);
    }

    if (method === "POST" && path === "/v1/auth/session") {
      const clientIp = request.headers.get("cf-connecting-ip") ?? "unknown";
      const rate = enforceRateLimit(`auth:session:${clientIp}`, 20, 60_000, traceId);
      if (rate instanceof Response) return rate;
      return handleAuthSession(request, env, traceId);
    }

    if (method === "GET" && path === "/v1/auth/me") {
      return handleAuthMe(request, env, traceId);
    }

    if (method === "POST" && path === "/v1/auth/logout") {
      return handleAuthLogout(request, env, traceId);
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
      const auth = await authorize(request, traceId, env, "operator", path, "event_ingest");
      if (auth instanceof Response) return auth;
      const rate = enforceRateLimit(`${path}:${auth.subject}:${auth.role}`, 30, 60_000, traceId);
      if (rate instanceof Response) return rate;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["source", "event_type", "occurred_at", "payload"],
        traceId
      );
      if ("response" in parsed) return parsed.response;
      const validated = validateIngestPayload(parsed.value, traceId);
      if ("response" in validated) return validated.response;
      const idem = await enforceIdempotency(request, path, validated.value, traceId, env);
      if (idem instanceof Response) return idem;
      const eventRow = await storeIngestEvent(
        {
          source: validated.value.source,
          eventType: validated.value.eventType,
          occurredAt: validated.value.occurredAt,
          payload: {
            payload: validated.value.payload,
            entity_refs: validated.value.entityRefs
          },
          traceId
        },
        env
      );
      await writeAudit({
        at: new Date().toISOString(),
        route: path,
        action: "event_ingest",
        actor: auth.subject,
        role: auth.role,
        result: "success",
        traceId
      }, env);
      return ok(
        { accepted: true, route: path, event_id: eventRow.id },
        { phase: "workers-contract", status: env.CIOS_DB ? "d1-persisted" : "fallback-persisted" },
        traceId
      );
    }

    if (method === "GET" && path === "/v1/events/search") {
      const auth = await authorize(request, traceId, env, "observer", path, "events_search");
      if (auth instanceof Response) return auth;
      const q = readListQuery(url);
      const filters = validateEventSearchFilters({
        text: url.searchParams.get("q"),
        source: url.searchParams.get("source"),
        eventType: url.searchParams.get("event_type"),
        from: q.from,
        to: q.to
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
          sortOrder: q.sortOrder
        },
        env
      );
      return ok(
        rows.map((row) => ({
          id: row.id,
          source: row.source,
          event_type: row.eventType,
          occurred_at: row.occurredAt,
          trace_id: row.traceId,
          payload: row.payload
        })),
        {
          pagination: { page: q.page, page_size: q.pageSize },
          filters,
          source: env.CIOS_DB ? "d1-search" : "fallback-search"
        },
        traceId
      );
    }

    if (method === "POST" && path === "/v1/simulations/run") {
      const auth = await authorize(request, traceId, env, "operator", path, "simulation_run");
      if (auth instanceof Response) return auth;
      const rate = enforceRateLimit(`${path}:${auth.subject}:${auth.role}`, 20, 60_000, traceId);
      if (rate instanceof Response) return rate;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["scenario_name", "base_state_ref", "input_parameters", "time_horizon"],
        traceId
      );
      if ("response" in parsed) return parsed.response;
      const validated = validateSimulationRunPayload(parsed.value, traceId);
      if ("response" in validated) return validated.response;
      await writeAudit({
        at: new Date().toISOString(),
        route: path,
        action: "simulation_run",
        actor: auth.subject,
        role: auth.role,
        result: "success",
        traceId
      }, env);
      return ok(
        {
          simulation_id: crypto.randomUUID(),
          status: "queued",
          scenario_name: validated.value.scenarioName,
          base_state_ref: validated.value.baseStateRef
        },
        { phase: "workers-contract", status: "stubbed" },
        traceId
      );
    }

    if (method === "POST" && path === "/v1/governance/approvals") {
      const auth = await authorize(request, traceId, env, "governor", path, "governance_approval");
      if (auth instanceof Response) return auth;
      const rate = enforceRateLimit(`${path}:${auth.subject}:${auth.role}`, 10, 60_000, traceId);
      if (rate instanceof Response) return rate;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["request_id", "decision", "reason"],
        traceId
      );
      if ("response" in parsed) return parsed.response;
      const validated = validateGovernanceApprovalPayload(parsed.value, traceId);
      if ("response" in validated) return validated.response;
      await writeAudit({
        at: new Date().toISOString(),
        route: path,
        action: "governance_approval",
        actor: auth.subject,
        role: auth.role,
        result: "success",
        traceId
      }, env);
      return ok(
        {
          approved: validated.value.decision === "approve",
          route: path,
          decision_id: crypto.randomUUID(),
          request_id: validated.value.requestId
        },
        { phase: "workers-contract", status: "stubbed" },
        traceId
      );
    }

    if (method === "POST" && path === "/v1/flow/dispatch") {
      const auth = await authorize(request, traceId, env, "governor", path, "flow_dispatch");
      if (auth instanceof Response) return auth;
      const rate = enforceRateLimit(`${path}:${auth.subject}:${auth.role}`, 10, 60_000, traceId);
      if (rate instanceof Response) return rate;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["trigger_name", "source_decision_id", "payload", "priority", "expected_callback", "requested_by"],
        traceId
      );
      if ("response" in parsed) return parsed.response;
      const validated = validateFlowDispatchPayload(parsed.value, traceId);
      if ("response" in validated) return validated.response;
      const idem = await enforceIdempotency(request, path, validated.value, traceId, env);
      if (idem instanceof Response) return idem;
      const flowRunId = crypto.randomUUID();
      await storeFlowLog(
        {
          flowRunId,
          triggerName: validated.value.triggerName,
          status: "accepted",
          completedAt: new Date().toISOString(),
          traceId,
          payload: validated.value.payload
        },
        env
      );
      await writeAudit({
        at: new Date().toISOString(),
        route: path,
        action: "flow_dispatch",
        actor: auth.subject,
        role: auth.role,
        result: "success",
        traceId
      }, env);
      return ok(
        { flow_dispatch_id: flowRunId, status: "accepted" },
        { phase: "workers-contract", status: env.CIOS_DB ? "d1-persisted" : "fallback-persisted" },
        traceId
      );
    }

    if (method === "POST" && path === "/v1/data/query") {
      const auth = await authorize(request, traceId, env, "operator", path, "data_query");
      if (auth instanceof Response) return auth;
      const rate = enforceRateLimit(`${path}:${auth.subject}:${auth.role}`, 25, 60_000, traceId);
      if (rate instanceof Response) return rate;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["dimensions", "metrics"],
        traceId
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
            time_slice: validated.value.timeSlice
          }
        },
        env
      );

      return ok(
        rows,
        {
          source: env.CIOS_DB ? "d1-query" : "fallback-query",
          query: {
            dimensions: validated.value.dimensions,
            metrics: validated.value.metrics,
            time_slice: validated.value.timeSlice,
            limit: validated.value.limit
          }
        },
        traceId
      );
    }

    if (method === "POST" && path === "/v1/flow/callback") {
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["flow_run_id", "trigger_name", "status", "completed_at", "trace_id"],
        traceId
      );
      if ("response" in parsed) return parsed.response;
      const sig = await verifyFlowSignature(parsed.value, request, traceId, env.FLOW_WEBHOOK_SECRET);
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
            details: { reason: "invalid_signature" }
          },
          env
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
          payload: validated.value
        },
        env
      );
      await writeAudit({
        at: new Date().toISOString(),
        route: path,
        action: "flow_callback",
        actor: "flow-system",
        role: "operator",
        result: "success",
        traceId
      }, env);
      return ok(
        { callback_processed: true, flow_run_id: validated.value.flowRunId },
        { phase: "workers-contract", status: "stubbed" },
        traceId
      );
    }

    if (method === "GET" && path === "/v1/governance/audit") {
      const auth = await authorize(request, traceId, env, "governor", path, "governance_audit_read");
      if (auth instanceof Response) return auth;
      const entries = await listAudit(100, env);
      return ok(entries, { phase: "workers-contract", status: env.CIOS_DB ? "d1-audit" : "fallback-audit" }, traceId);
    }

    if (method === "GET" && path === "/v1/bootstrap") {
      const auth = await authorize(request, traceId, env, "observer", path, "bootstrap_read");
      if (auth instanceof Response) return auth;
      const data = await buildBootstrap(env, auth.claims);
      return ok(data, { route: "/v1/bootstrap", source: "workers" }, traceId);
    }

    if (method === "GET" && path === "/v1/overview") {
      const auth = await authorize(request, traceId, env, "observer", path, "overview_read");
      if (auth instanceof Response) return auth;
      const data = await buildOverview(env, workspaceFromAuth(auth));
      return ok(data, { route: "/v1/overview", source: data.source }, traceId);
    }

    if (method === "GET" && path === "/v1/crm/organizations") {
      const auth = await authorize(request, traceId, env, "observer", path, "crm_list");
      if (auth instanceof Response) return auth;
      const search = url.searchParams.get("q") ?? url.searchParams.get("search");
      const result = await listOrganizations(env, workspaceFromAuth(auth), search);
      return ok(
        {
          total: result.rows.length,
          organizations: result.rows
        },
        { source: result.source },
        traceId
      );
    }

    if (method === "GET" && path.startsWith("/v1/crm/organizations/")) {
      const rest = path.slice("/v1/crm/organizations/".length);
      const segments = rest.split("/").filter(Boolean);
      // Deferred R2 write/enrich paths must not be treated as organization ids.
      if (
        segments[0] === "import" ||
        segments.includes("enrich") ||
        segments.includes("analyze-website")
      ) {
        return fail(
          501,
          "NOT_IMPLEMENTED",
          "Route deferred to R2 (outside R1 Working Product).",
          { method, path },
          traceId
        );
      }
      if (segments.length !== 1) {
        return fail(404, "NOT_FOUND", "Organization not found.", { path }, traceId);
      }
      const auth = await authorize(request, traceId, env, "observer", path, "crm_detail");
      if (auth instanceof Response) return auth;
      const id = decodeURIComponent(segments[0] ?? "");
      const detail = await getOrganization(env, workspaceFromAuth(auth), id);
      if (!detail) {
        return fail(404, "NOT_FOUND", "Organization not found.", { id }, traceId);
      }
      return ok(
        {
          organization: {
            id: detail.id,
            name: detail.name,
            domain: detail.domain,
            industry: detail.industry,
            fitScore: detail.fitScore,
            intentScore: detail.intentScore,
            stage: detail.stage,
            owner: detail.owner,
            nextActions: detail.nextActions,
            lineage: detail.lineage
          }
        },
        { source: "d1-or-seed" },
        traceId
      );
    }

    if (method === "GET" && path === "/v1/discovery/sources") {
      const auth = await authorize(request, traceId, env, "observer", path, "discovery_sources");
      if (auth instanceof Response) return auth;
      const result = await listDiscoverySources(env, workspaceFromAuth(auth));
      return ok(
        {
          queue: result.rows,
          total: result.rows.length
        },
        { source: result.source },
        traceId
      );
    }

    if (method === "GET" && path === "/v1/discovery/crawl-governance") {
      const auth = await authorize(request, traceId, env, "observer", path, "crawl_governance");
      if (auth instanceof Response) return auth;
      const result = await listCrawlGovernance(env, workspaceFromAuth(auth));
      return ok(
        {
          decisions: result.rows,
          total: result.rows.length
        },
        { source: result.source },
        traceId
      );
    }

    if (method === "GET" && (path === "/v1/review/queue" || path === "/v1/reviews")) {
      const auth = await authorize(request, traceId, env, "observer", path, "review_queue");
      if (auth instanceof Response) return auth;
      const result = await listReviewQueue(env, workspaceFromAuth(auth));
      return ok(
        {
          items: result.rows,
          total: result.rows.length
        },
        { source: result.source },
        traceId
      );
    }

    if (method === "GET" && (path === "/v1/compliance/audit" || path === "/v1/compliance/audit-log")) {
      const auth = await authorize(request, traceId, env, "observer", path, "compliance_audit");
      if (auth instanceof Response) return auth;
      const result = await listComplianceAudit(env, workspaceFromAuth(auth));
      return ok(
        {
          audit: result.rows.map((row) => ({
            at: row.createdAt,
            actor: row.actor,
            type: row.action,
            message: `${row.result}${row.details ? ` — ${JSON.stringify(row.details)}` : ""}`,
            id: row.id,
            result: row.result,
            details: row.details,
            createdAt: row.createdAt
          })),
          entries: result.rows,
          total: result.rows.length
        },
        { source: result.source },
        traceId
      );
    }

    if (method === "GET" && path === "/v1/flow/logs") {
      // Global flow logs are not workspace-scoped — keep governor (R1).
      const auth = await authorize(request, traceId, env, "governor", path, "flow_logs_read");
      if (auth instanceof Response) return auth;
      const q = readListQuery(url);
      const logs = await listFlowLogs(
        {
          page: q.page,
          pageSize: q.pageSize,
          from: q.from,
          to: q.to
        },
        env
      );
      return ok(
        logs.map((row) => ({
          flow_run_id: row.flowRunId,
          trigger_name: row.triggerName,
          status: row.status,
          completed_at: row.completedAt,
          trace_id: row.traceId
        })),
        { pagination: { page: q.page, page_size: q.pageSize }, filters: { from: q.from, to: q.to } },
        traceId
      );
    }

    if (method === "GET" && path === "/v1/reports/hourly") {
      const auth = await authorize(request, traceId, env, "observer", path, "reports_hourly_read");
      if (auth instanceof Response) return auth;
      const q = readListQuery(url);
      const reports = await listHourlyReports(
        {
          page: q.page,
          pageSize: q.pageSize,
          from: q.from,
          to: q.to,
          sortOrder: q.sortOrder
        },
        env
      );
      return ok(
        reports.map((report) => ({
          report_id: report.reportId,
          generated_at: report.generatedAt,
          bucket_start: report.bucketStart,
          event_count: report.eventCount,
          risk_summary: report.riskSummary,
          anomaly_count: report.anomalyCount
        })),
        {
          pagination: { page: q.page, page_size: q.pageSize },
          sort: { by: q.sortBy, order: q.sortOrder },
          source: env.CIOS_DB ? "d1-aggregated" : "fallback-aggregated"
        },
        traceId
      );
    }

    if (
      path.startsWith("/v1/payment/") ||
      path.startsWith("/v1/auth/google") ||
      path === "/v1/crm/organizations/import" ||
      (method === "POST" && path === "/v1/crm/organizations") ||
      path.endsWith("/enrich") ||
      path.endsWith("/analyze-website")
    ) {
      return fail(
        501,
        "NOT_IMPLEMENTED",
        "Route deferred to R2 (outside R1 Working Product).",
        { method, path },
        traceId
      );
    }

    return fail(404, "NOT_FOUND", "Route not found.", { method, path }, traceId);
}
