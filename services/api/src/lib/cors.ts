const ALLOWED_HEADERS = "Authorization, Content-Type, Idempotency-Key, x-trace-id";

const ALLOWED_ORIGINS = new Set([
  "https://cios.iai.one",
  "https://www.cios.iai.one",
  "https://cios-iai-one.pages.dev",
  "https://cios-iai-one-3ai.pages.dev",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8787",
  "http://127.0.0.1:8787"
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Cloudflare Pages preview deployments for this project
  if (/^https:\/\/[a-z0-9-]+\.cios-iai-one\.pages\.dev$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.cios-iai-one-3ai\.pages\.dev$/i.test(origin)) return true;
  return false;
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": ALLOWED_HEADERS,
    "access-control-max-age": "86400",
    vary: "Origin"
  };
  if (isAllowedOrigin(origin)) {
    headers["access-control-allow-origin"] = origin!;
  }
  return headers;
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
