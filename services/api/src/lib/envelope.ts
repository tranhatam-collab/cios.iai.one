export type ApiEnvelope = {
  ok: boolean;
  data: unknown;
  meta: Record<string, unknown>;
  error: { code: string; message: string; details?: unknown } | null;
  trace_id: string;
};

export function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers":
      "authorization, content-type, x-flow-signature, x-workspace-id, x-trace-id",
  };
}

export function makeTraceId(): string {
  return crypto.randomUUID();
}

function json(status: number, envelope: ApiEnvelope): Response {
  return new Response(JSON.stringify(envelope), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

export function ok(
  data: unknown,
  meta: Record<string, unknown> = {},
  traceId = makeTraceId(),
): Response {
  return json(200, {
    ok: true,
    data,
    meta,
    error: null,
    trace_id: traceId,
  });
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  traceId = makeTraceId(),
): Response {
  return json(status, {
    ok: false,
    data: null,
    meta: {},
    error: { code, message, details },
    trace_id: traceId,
  });
}
