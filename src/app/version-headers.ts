import type { FastifyInstance } from "fastify";
import type { Logger } from "pino";

import { getApiCompat, getReleaseInfo } from "../core/release.js";

type AppInstance = FastifyInstance<
  import("http").Server,
  import("http").IncomingMessage,
  import("http").ServerResponse,
  Logger
>;

export function registerVersionHeaders(app: AppInstance): void {
  app.addHook("onSend", async (_request, reply, payload) => {
    const r = getReleaseInfo();
    reply.header("X-App-Version", r.version);
    reply.header("X-API-Compat", getApiCompat());
    return payload;
  });
}
