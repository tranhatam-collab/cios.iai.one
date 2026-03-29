import { fail } from "./envelope";

type Bucket = {
  count: number;
  windowStartMs: number;
};

const buckets = new Map<string, Bucket>();

export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  traceId: string
): true | Response {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.windowStartMs > windowMs) {
    buckets.set(key, { count: 1, windowStartMs: now });
    return true;
  }
  if (current.count >= limit) {
    return fail(
      429,
      "RATE_LIMITED",
      "Too many requests for sensitive endpoint.",
      { retry_after_ms: windowMs - (now - current.windowStartMs) },
      traceId
    );
  }
  current.count += 1;
  buckets.set(key, current);
  return true;
}
