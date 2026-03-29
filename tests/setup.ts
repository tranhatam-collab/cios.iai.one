import { afterAll } from "vitest";

process.env.NODE_ENV ??= "test";
process.env.PORT ??= "3000";
process.env.APP_NAME ??= "customer-intelligence-os-api";
process.env.APP_BASE_URL ??= "http://localhost:3000";
process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/test";
process.env.JWT_SECRET ??= "test-jwt-secret-ci-only";
process.env.SESSION_SECRET ??= "test-session-secret-ci-only";
process.env.LOG_LEVEL ??= "silent";

afterAll(async () => {
  const { dbPool } = await import("../src/bootstrap/db.js");
  await dbPool.end();
});
