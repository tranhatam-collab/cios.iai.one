import type { FastifyInstance } from "fastify";
import type { Logger } from "pino";

import { ERROR_CODES } from "../../../app/error-codes.js";
import { checkDbHealth } from "../../../bootstrap/db.js";
import { env } from "../../../bootstrap/env.js";
import { envelopeError, envelopeOk } from "../response-envelope.js";

type AppInstance = FastifyInstance<
  import("http").Server,
  import("http").IncomingMessage,
  import("http").ServerResponse,
  Logger
>;

export async function registerHealthRoutes(app: AppInstance): Promise<void> {
  app.get("/health", async (request) =>
    envelopeOk(request, {
      service: env.APP_NAME,
    }),
  );

  app.get("/health/db", async (request, reply) => {
    try {
      const dbOk = await checkDbHealth();
      return envelopeOk(request, {
        service: env.APP_NAME,
        db_ok: dbOk,
      });
    } catch {
      return reply.status(503).send(
        envelopeError(request, {
          code: ERROR_CODES.dbUnavailable,
          message: "Database health check failed.",
          details: { service: env.APP_NAME },
          retryable: true,
        }),
      );
    }
  });
}
