import { createApp } from "./app/create-app.js";
import { dbPool } from "./bootstrap/db.js";
import { env } from "./bootstrap/env.js";
import { logger } from "./bootstrap/logger.js";

async function bootstrap() {
  const app = await createApp();

  app.addHook("onClose", async () => {
    await dbPool.end();
  });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  logger.info({ port: env.PORT, app: env.APP_NAME }, "server started");
}

bootstrap().catch((error) => {
  logger.error({ error }, "failed to bootstrap application");
  process.exit(1);
});
