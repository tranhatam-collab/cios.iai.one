import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app/create-app.js";

describe("GET /health", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("customer-intelligence-os-api");
  });
});
