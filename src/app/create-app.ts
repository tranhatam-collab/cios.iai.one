import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import Fastify from "fastify";

import { env } from "../bootstrap/env.js";
import { logger } from "../bootstrap/logger.js";
import { getApiCompat } from "../core/release.js";
import { registerVersionHeaders } from "./version-headers.js";
import { registerHealthRoutes } from "../interfaces/http/routes/health.routes.js";
import { registerV1MetaRoutes } from "../interfaces/http/routes/v1/meta.routes.js";

export async function createApp() {
  const app = Fastify({
    loggerInstance: logger
  });

  registerVersionHeaders(app);

  await app.register(cors, { origin: true, credentials: true });
  await app.register(helmet);
  await app.register(cookie);
  await app.register(jwt, { secret: env.JWT_SECRET });

  await registerHealthRoutes(app);

  await app.register(
    async (v1) => {
      await registerV1MetaRoutes(v1);
    },
    { prefix: `/${getApiCompat()}` }
  );

  return app;
}
