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
    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: { service: string };
      request_id: string;
      meta: { request_id: string };
      error: null;
    };
    expect(body.ok).toBe(true);
    expect(body.data.service).toBe("customer-intelligence-os-api");
    expect(body.request_id.length).toBeGreaterThan(0);
    expect(body.meta.request_id).toBe(body.request_id);
    expect(body.error).toBeNull();
  });
});
