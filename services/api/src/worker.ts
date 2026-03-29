import { requireAuth, requireRole, type AuthContext, type Role } from "./lib/auth";
import { fail, makeTraceId, ok } from "./lib/envelope";
import { listAudit, writeAudit } from "./lib/audit";
import { listFlowLogs, storeFlowLog, storeIngestEvent } from "./lib/domain-store";
import { enforceIdempotency } from "./lib/idempotency";
import type { WorkerEnv } from "./lib/persistence";
import { enforceRateLimit } from "./lib/rate-limit";
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
      trust_index: 72,
      stress_index: 41,
      risk_level: "medium"
    },
    { contract: "phase2-workers-v1" },
    traceId
  );
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

async function handleSystemMetrics(traceId: string): Promise<Response> {
  return ok(
    {
      throughput_per_min: 18,
      active_incidents: 2,
      anomaly_count: 5,
      queue_depth: 11
    },
    {},
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
    const url = new URL(request.url);
    const traceId = request.headers.get("x-trace-id") ?? makeTraceId();
    const method = request.method.toUpperCase();
    const path = url.pathname;

    if (method === "GET" && path === "/v1/system/state") {
      return handleSystemState(traceId);
    }

    if (method === "GET" && path === "/v1/system/health") {
      return handleSystemHealth(traceId);
    }

    if (method === "GET" && path === "/v1/system/metrics") {
      return handleSystemMetrics(traceId);
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
      const idem = await enforceIdempotency(request, path, parsed.value, traceId, env);
      if (idem instanceof Response) return idem;
      const eventRow = await storeIngestEvent(
        {
          source: String(parsed.value.source),
          eventType: String(parsed.value.event_type),
          occurredAt: String(parsed.value.occurred_at),
          payload: parsed.value.payload,
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
        { simulation_id: crypto.randomUUID(), status: "queued" },
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
        { approved: true, route: path, decision_id: crypto.randomUUID() },
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
      const idem = await enforceIdempotency(request, path, parsed.value, traceId, env);
      if (idem instanceof Response) return idem;
      const flowRunId = crypto.randomUUID();
      await storeFlowLog(
        {
          flowRunId,
          triggerName: String(parsed.value.trigger_name),
          status: "accepted",
          completedAt: new Date().toISOString(),
          traceId,
          payload: parsed.value.payload
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

    if (method === "POST" && path === "/v1/flow/callback") {
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["flow_run_id", "trigger_name", "status", "completed_at", "trace_id"],
        traceId
      );
      if ("response" in parsed) return parsed.response;
      await storeFlowLog(
        {
          flowRunId: String(parsed.value.flow_run_id),
          triggerName: String(parsed.value.trigger_name),
          status: String(parsed.value.status),
          completedAt: String(parsed.value.completed_at),
          traceId: String(parsed.value.trace_id),
          payload: parsed.value
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
        { callback_processed: true, flow_run_id: parsed.value.flow_run_id },
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

    if (method === "GET" && path === "/v1/flow/logs") {
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
      return ok(
        [
          {
            report_id: "hourly_001",
            generated_at: new Date().toISOString(),
            risk_summary: "medium",
            anomaly_count: 5
          }
        ],
        { pagination: { page: q.page, page_size: q.pageSize }, sort: { by: q.sortBy, order: q.sortOrder } },
        traceId
      );
    }

    return fail(404, "NOT_FOUND", "Route not found.", { method, path }, traceId);
  }
};
