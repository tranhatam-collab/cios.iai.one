import { fail } from "./envelope";

type ValidationResult<T> = { value: T } | { response: Response };

export async function parseJsonBody<T>(
  request: Request,
  requiredKeys: string[],
  traceId: string
): Promise<ValidationResult<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      response: fail(400, "VALIDATION_FAILED", "Request body must be valid JSON.", undefined, traceId)
    };
  }

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
