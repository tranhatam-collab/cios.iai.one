const ALLOWED_HEADERS = "Authorization, Content-Type, Idempotency-Key, x-trace-id";

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": ALLOWED_HEADERS,
    "access-control-max-age": "86400"
  };
}

export function withCors(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function corsPreflight(request: Request): Response | null {
  if (request.method.toUpperCase() !== "OPTIONS") return null;
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request)
  });
}
