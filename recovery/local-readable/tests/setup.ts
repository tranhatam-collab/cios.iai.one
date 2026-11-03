import { afterAll } from "vitest";

process.env.NODE_ENV ??= "test";
process.env.PORT ??= "3000";
process.env.APP_NAME ??= "customer-intelligence-os-api";
process.env.APP_BASE_URL ??= "http://localhost:3000";
process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/test";
process.env.JWT_SECRET ??= "test-jwt-secret-ci-only";
process.env.SESSION_SECRET ??= "test-session-secret-ci-only";
process.env.LOG_LEVEL ??= "silent";
process.env.FLOW_WEBHOOK_SECRET ??= "test-flow-webhook-secret";
process.env.AIAGENT_API_URL ??= "https://api.aiagent.iai.one";
process.env.AIAGENT_API_KEY ??= "sk-aiagent-test-key";
process.env.FRONTEND_URL ??= "https://cios.iai.one";

afterAll(async () => {
  const { dbPool } = await import("../src/bootstrap/db.js");
  await dbPool.end();
});
