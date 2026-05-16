import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app/create-app.js";

describe("phase0 day5 realtime minimum useful layer", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let salesToken = "";
  let complianceToken = "";

  const password = "demo123456";
  const salesEmail = `qa-phase0-rt-sales-${Date.now()}@iai.one`;
  const complianceEmail = `qa-phase0-rt-compliance-${Date.now()}@iai.one`;

  beforeAll(async () => {
    app = await createApp();

    await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: salesEmail,
        password,
        displayName: "Phase0 RT Sales",
        workspaceCode: "demo",
        role: "sales_rep",
      },
    });

    await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: complianceEmail,
        password,
        displayName: "Phase0 RT Compliance",
        workspaceCode: "demo",
        role: "compliance_admin",
      },
    });

    const salesSession = await app.inject({
      method: "POST",
      url: "/v1/auth/session",
      payload: {
        email: salesEmail,
        password,
        workspaceCode: "demo",
      },
    });
    salesToken = (JSON.parse(salesSession.body) as { data: { token: string } })
      .data.token;

    const complianceSession = await app.inject({
      method: "POST",
      url: "/v1/auth/session",
      payload: {
        email: complianceEmail,
        password,
        workspaceCode: "demo",
      },
    });
    complianceToken = (
      JSON.parse(complianceSession.body) as { data: { token: string } }
    ).data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("keeps realtime recent endpoint protected by auth + permissions", async () => {
    const unauth = await app.inject({
      method: "GET",
      url: "/realtime/events/recent",
    });
    expect(unauth.statusCode).toBe(401);

    const forbidden = await app.inject({
      method: "GET",
      url: "/realtime/events/recent",
      headers: { authorization: `Bearer ${salesToken}` },
    });
    expect(forbidden.statusCode).toBe(403);
  });

  it("exposes recent realtime events for authorized role", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/sources/discovery-queue",
      headers: { authorization: `Bearer ${complianceToken}` },
    });

    const res = await app.inject({
      method: "GET",
      url: "/realtime/events/recent?limit=10",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: {
        total: number;
        events: Array<{ payload_minimal?: { category?: string } }>;
      };
    };

    expect(body.ok).toBe(true);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    expect(
      body.data.events.some(
        (event) => event.payload_minimal?.category === "source.job.completed",
      ),
    ).toBe(true);
  });
});
