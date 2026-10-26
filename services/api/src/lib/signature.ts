import { fail } from "./envelope";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(new Uint8Array(digest));
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function verifyFlowSignature(
  body: unknown,
  request: Request,
  traceId: string,
  secret?: string
): Promise<true | Response> {
  if (!secret) {
    return fail(
      500,
      "CONFIG_ERROR",
      "FLOW_WEBHOOK_SECRET is not configured.",
      undefined,
      traceId
    );
  }
  const provided = request.headers.get("x-flow-signature");
  if (!provided) {
    return fail(401, "UNAUTHORIZED", "Missing x-flow-signature header.", undefined, traceId);
  }
  const payload = JSON.stringify(body ?? {});
  const expected = await hmacHex(payload, secret);
  if (!timingSafeEqualHex(provided.toLowerCase(), expected.toLowerCase())) {
    return fail(401, "UNAUTHORIZED", "Invalid flow callback signature.", undefined, traceId);
  }
  return true;
}
