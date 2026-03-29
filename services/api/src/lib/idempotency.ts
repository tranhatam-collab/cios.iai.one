import { fail } from "./envelope";

type Entry = {
  route: string;
  payloadHash: string;
  createdAtMs: number;
};

const TTL_MS = 24 * 60 * 60 * 1000;
const keyStore = new Map<string, Entry>();

async function hashPayload(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload ?? {}));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function gc(now: number): void {
  for (const [key, value] of keyStore) {
    if (now - value.createdAtMs > TTL_MS) {
      keyStore.delete(key);
    }
  }
}

export async function enforceIdempotency(
  request: Request,
  route: string,
  body: unknown,
  traceId: string
): Promise<true | Response> {
  const rawKey = request.headers.get("idempotency-key");
  if (!rawKey) {
    return fail(400, "VALIDATION_FAILED", "Missing Idempotency-Key header.", undefined, traceId);
  }

  const now = Date.now();
  gc(now);
  const payloadHash = await hashPayload(body);
  const existing = keyStore.get(rawKey);
  if (!existing) {
    keyStore.set(rawKey, { route, payloadHash, createdAtMs: now });
    return true;
  }
  if (existing.route !== route || existing.payloadHash !== payloadHash) {
    return fail(
      409,
      "IDEMPOTENCY_CONFLICT",
      "Idempotency key already used with different route or payload.",
      undefined,
      traceId
    );
  }
  return true;
}
