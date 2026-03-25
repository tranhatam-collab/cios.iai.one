import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app/create-app.js";

describe("GET /v1/meta", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns release and capabilities", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/meta" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      ok: boolean;
      release: { version: string; apiCompat: string };
      capabilities: { restPrefix: string; moduleRegistry: boolean };
    };
    expect(body.ok).toBe(true);
    expect(body.release.apiCompat).toBe("v1");
    expect(body.release.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.capabilities.restPrefix).toBe("/v1");
    expect(body.capabilities.moduleRegistry).toBe(true);
  });
});

describe("version headers", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("sets X-App-Version and X-API-Compat on responses", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["x-app-version"]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(res.headers["x-api-compat"]).toBe("v1");
  });
});
