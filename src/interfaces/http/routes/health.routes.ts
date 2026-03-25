import type { FastifyInstance } from "fastify";
import type { Logger } from "pino";

import { checkDbHealth } from "../../../bootstrap/db.js";
import { env } from "../../../bootstrap/env.js";

type AppInstance = FastifyInstance<
  import("http").Server,
  import("http").IncomingMessage,
  import("http").ServerResponse,
  Logger
>;

export async function registerHealthRoutes(app: AppInstance): Promise<void> {
  app.get("/health", async () => ({
    ok: true,
    service: env.APP_NAME
  }));

  app.get("/health/db", async (_request, reply) => {
    try {
      const dbOk = await checkDbHealth();
      return {
        ok: dbOk,
        service: env.APP_NAME
      };
    } catch {
      return reply.status(503).send({
        ok: false,
        service: env.APP_NAME
      });
    }
  });
}
