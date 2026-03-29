export type ApiEnvelope = {
  ok: boolean;
  data: unknown;
  meta: Record<string, unknown>;
  error: { code: string; message: string; details?: unknown } | null;
  trace_id: string;
};

export function makeTraceId(): string {
  return crypto.randomUUID();
}

function json(status: number, envelope: ApiEnvelope): Response {
  return new Response(JSON.stringify(envelope), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export function ok(data: unknown, meta: Record<string, unknown> = {}, traceId = makeTraceId()): Response {
  return json(200, {
    ok: true,
    data,
    meta,
    error: null,
    trace_id: traceId
  });
}

export function fail(
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
