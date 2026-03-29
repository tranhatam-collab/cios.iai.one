type ApiEnvelope = {
  ok: boolean;
  data: unknown;
  meta: Record<string, unknown>;
  error: { code: string; message: string; details?: unknown } | null;
  trace_id: string;
};

function makeTraceId(): string {
  return crypto.randomUUID();
}

function json(status: number, envelope: ApiEnvelope): Response {
  return new Response(JSON.stringify(envelope), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function ok(data: unknown, meta: Record<string, unknown> = {}, traceId = makeTraceId()): Response {
  return json(200, {
    ok: true,
    data,
    meta,
    error: null,
    trace_id: traceId
  });
}

function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  traceId = makeTraceId()
): Response {
  return json(status, {
    ok: false,
    data: null,
    meta: {},
    error: { code, message, details },
    trace_id: traceId
  });
}

function unauthorized(traceId: string): Response {
  return fail(401, "UNAUTHORIZED", "Missing or invalid bearer token.", undefined, traceId);
}

function getBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
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

async function handleNotImplemented(route: string, traceId: string): Promise<Response> {
  return fail(501, "NOT_IMPLEMENTED", `Route ${route} is defined in contract but not implemented yet.`, undefined, traceId);
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const traceId = request.headers.get("x-trace-id") ?? makeTraceId();
    const token = getBearerToken(request);
    const method = request.method.toUpperCase();
    const path = url.pathname;

    if (method === "GET" && path === "/v1/system/state") {
      return handleSystemState(traceId);
    }

    if (method === "POST" && path === "/v1/events/ingest") {
      if (!token) return unauthorized(traceId);
      return handleNotImplemented(path, traceId);
    }

    if (method === "POST" && path === "/v1/simulations/run") {
      if (!token) return unauthorized(traceId);
      return handleNotImplemented(path, traceId);
    }

    if (method === "POST" && path === "/v1/governance/approvals") {
      if (!token) return unauthorized(traceId);
      return handleNotImplemented(path, traceId);
    }

    if (method === "POST" && path === "/v1/flow/dispatch") {
      if (!token) return unauthorized(traceId);
      return handleNotImplemented(path, traceId);
    }

    if (method === "POST" && path === "/v1/flow/callback") {
      return handleNotImplemented(path, traceId);
    }

    return fail(404, "NOT_FOUND", "Route not found.", { method, path }, traceId);
  }
};
