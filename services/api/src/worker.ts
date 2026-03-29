import { requireAuth, requireRole } from "./lib/auth";
import { fail, makeTraceId, ok } from "./lib/envelope";
import { enforceIdempotency } from "./lib/idempotency";
import { parseJsonBody } from "./lib/validation";

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

async function handleNotImplemented(route: string, traceId: string): Promise<Response> {
  return fail(
    501,
    "NOT_IMPLEMENTED",
    `Route ${route} is defined in contract but not implemented yet.`,
    undefined,
    traceId
  );
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const traceId = request.headers.get("x-trace-id") ?? makeTraceId();
    const method = request.method.toUpperCase();
    const path = url.pathname;

    if (method === "GET" && path === "/v1/system/state") {
      return handleSystemState(traceId);
    }

    if (method === "POST" && path === "/v1/events/ingest") {
      const auth = requireAuth(request, traceId);
      if (auth instanceof Response) return auth;
      const roleOk = requireRole(auth, "operator", traceId);
      if (roleOk instanceof Response) return roleOk;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["source", "event_type", "occurred_at", "payload"],
        traceId
      );
      if ("response" in parsed) return parsed.response;
      const idem = await enforceIdempotency(request, path, parsed.value, traceId);
      if (idem instanceof Response) return idem;
      return ok({ accepted: true, route: path }, { phase: "workers-contract", status: "stubbed" }, traceId);
    }

    if (method === "POST" && path === "/v1/simulations/run") {
      const auth = requireAuth(request, traceId);
      if (auth instanceof Response) return auth;
      const roleOk = requireRole(auth, "operator", traceId);
      if (roleOk instanceof Response) return roleOk;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["scenario_name", "base_state_ref", "input_parameters", "time_horizon"],
        traceId
      );
      if ("response" in parsed) return parsed.response;
      return ok(
        { simulation_id: crypto.randomUUID(), status: "queued" },
        { phase: "workers-contract", status: "stubbed" },
        traceId
      );
    }

    if (method === "POST" && path === "/v1/governance/approvals") {
      const auth = requireAuth(request, traceId);
      if (auth instanceof Response) return auth;
      const roleOk = requireRole(auth, "governor", traceId);
      if (roleOk instanceof Response) return roleOk;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["request_id", "decision", "reason"],
        traceId
      );
      if ("response" in parsed) return parsed.response;
      return ok(
        { approved: true, route: path, decision_id: crypto.randomUUID() },
        { phase: "workers-contract", status: "stubbed" },
        traceId
      );
    }

    if (method === "POST" && path === "/v1/flow/dispatch") {
      const auth = requireAuth(request, traceId);
      if (auth instanceof Response) return auth;
      const roleOk = requireRole(auth, "governor", traceId);
      if (roleOk instanceof Response) return roleOk;
      const parsed = await parseJsonBody<Record<string, unknown>>(
        request,
        ["trigger_name", "source_decision_id", "payload", "priority", "expected_callback", "requested_by"],
        traceId
      );
      if ("response" in parsed) return parsed.response;
      const idem = await enforceIdempotency(request, path, parsed.value, traceId);
      if (idem instanceof Response) return idem;
      return ok(
        { flow_dispatch_id: crypto.randomUUID(), status: "accepted" },
        { phase: "workers-contract", status: "stubbed" },
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
      return ok(
        { callback_processed: true, flow_run_id: parsed.value.flow_run_id },
        { phase: "workers-contract", status: "stubbed" },
        traceId
      );
    }

    return fail(404, "NOT_FOUND", "Route not found.", { method, path }, traceId);
  }
};
