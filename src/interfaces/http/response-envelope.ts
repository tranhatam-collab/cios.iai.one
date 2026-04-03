import type { FastifyRequest } from "fastify";

type ErrorPayload = {
  code: string;
  message: string;
  details: unknown;
  retryable: boolean;
};

type BaseEnvelope = {
  meta: {
    request_id: string;
    timestamp: string;
  } & Record<string, unknown>;
  request_id: string;
};

function buildBaseMeta(
  request: FastifyRequest,
  extra?: Record<string, unknown>,
): BaseEnvelope {
  return {
    meta: {
      request_id: request.id,
      timestamp: new Date().toISOString(),
      ...(extra ?? {}),
    },
    request_id: request.id,
  };
}

export function envelopeOk<T>(
  request: FastifyRequest,
  data: T,
  extraMeta?: Record<string, unknown>,
): { ok: true; data: T; error: null } & BaseEnvelope {
  const base = buildBaseMeta(request, extraMeta);
  return {
    ok: true,
    data,
    error: null,
    ...base,
  };
}

export function envelopeError(
  request: FastifyRequest,
  error: {
    code: string;
    message: string;
    details?: unknown;
    retryable?: boolean;
  },
  extraMeta?: Record<string, unknown>,
): { ok: false; data: null; error: ErrorPayload } & BaseEnvelope {
  const base = buildBaseMeta(request, extraMeta);
  return {
    ok: false,
    data: null,
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? null,
      retryable: error.retryable ?? false,
    },
    ...base,
  };
}
