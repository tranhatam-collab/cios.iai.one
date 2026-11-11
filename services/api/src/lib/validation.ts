import { fail } from "./envelope";

type ValidationResult<T> = { value: T } | { response: Response };

// Largest JSON body any route accepts; bigger requests get 413 instead of being parsed.
export const MAX_JSON_BODY_BYTES = 256 * 1024;

type JsonBodyRead = { value: unknown } | { tooLarge: true } | { invalid: true };

export async function readJsonBody(request: Request): Promise<JsonBodyRead> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_JSON_BODY_BYTES) return { tooLarge: true };
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { invalid: true };
  }
  if (text.length > MAX_JSON_BODY_BYTES) return { tooLarge: true };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { invalid: true };
  }
}

export function payloadTooLarge(traceId: string): Response {
  return fail(
    413,
    "PAYLOAD_TOO_LARGE",
    "Request body is too large.",
    { max_bytes: MAX_JSON_BODY_BYTES },
    traceId
  );
}

export async function parseJsonBody<T>(
  request: Request,
  requiredKeys: string[],
  traceId: string
): Promise<ValidationResult<T>> {
  const read = await readJsonBody(request);
  if ("tooLarge" in read) return { response: payloadTooLarge(traceId) };
  if ("invalid" in read) {
    return {
      response: fail(400, "VALIDATION_FAILED", "Request body must be valid JSON.", undefined, traceId)
    };
  }
  const body: unknown = read.value;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      response: fail(400, "VALIDATION_FAILED", "Request body must be a JSON object.", undefined, traceId)
    };
  }

  const asRecord = body as Record<string, unknown>;
  const missing = requiredKeys.filter((key) => !(key in asRecord));
  if (missing.length > 0) {
    return {
      response: fail(
        400,
        "VALIDATION_FAILED",
        "Missing required fields.",
        { missing_fields: missing },
        traceId
      )
    };
  }

  return { value: body as T };
}
