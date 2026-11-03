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

export async function verifyFlowSignature(
  body: unknown,
  request: Request,
  traceId: string,
  secret?: string
): Promise<true | Response> {
  if (!secret) {
    return true;
  }
  const provided = request.headers.get("x-flow-signature");
  if (!provided) {
    return fail(401, "UNAUTHORIZED", "Missing x-flow-signature header.", undefined, traceId);
  }
  const payload = JSON.stringify(body ?? {});
  const expected = await hmacHex(payload, secret);
  if (provided !== expected) {
    return fail(401, "UNAUTHORIZED", "Invalid flow callback signature.", undefined, traceId);
  }
  return true;
}
