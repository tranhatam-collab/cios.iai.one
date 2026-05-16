import { fail } from "./envelope";
import { ensurePersistenceSchema, type WorkerEnv } from "./persistence";

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
  traceId: string,
  env?: WorkerEnv
): Promise<true | Response> {
  const rawKey = request.headers.get("idempotency-key");
  if (!rawKey) {
    return fail(400, "VALIDATION_FAILED", "Missing Idempotency-Key header.", undefined, traceId);
  }

  const now = Date.now();
  const payloadHash = await hashPayload(body);

  if (env?.CIOS_DB) {
    await ensurePersistenceSchema(env);
    await env.CIOS_DB.prepare("DELETE FROM api_idempotency_keys WHERE expires_at_ms < ?").bind(now).run();

    const existing = await env.CIOS_DB.prepare(
      "SELECT route, payload_hash FROM api_idempotency_keys WHERE idem_key = ? LIMIT 1"
    )
      .bind(rawKey)
      .first<{ route: string; payload_hash: string }>();

    if (!existing) {
      await env.CIOS_DB.prepare(
        "INSERT INTO api_idempotency_keys (idem_key, route, payload_hash, created_at_ms, expires_at_ms) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(rawKey, route, payloadHash, now, now + TTL_MS)
        .run();
      return true;
    }

    if (existing.route !== route || existing.payload_hash !== payloadHash) {
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

  if (env?.CIOS_KV) {
    const kvKey = `idem:${rawKey}`;
    const existingRaw = await env.CIOS_KV.get(kvKey);
    if (!existingRaw) {
      await env.CIOS_KV.put(
        kvKey,
        JSON.stringify({ route, payloadHash, createdAtMs: now }),
        { expirationTtl: Math.floor(TTL_MS / 1000) }
      );
      return true;
    }
    const existing = JSON.parse(existingRaw) as { route: string; payloadHash: string };
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

  gc(now);
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
