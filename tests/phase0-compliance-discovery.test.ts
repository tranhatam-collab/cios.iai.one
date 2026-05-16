import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app/create-app.js";

describe("phase0 day3/day4 compliance + discovery read surfaces", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let complianceToken = "";

  const password = "demo123456";
  const complianceEmail = `qa-phase0-comp-disc-${Date.now()}@iai.one`;

  beforeAll(async () => {
    app = await createApp();

    await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: complianceEmail,
        password,
        displayName: "Phase0 Compliance Discovery",
        workspaceCode: "demo",
        role: "compliance_admin",
      },
    });

    const session = await app.inject({
      method: "POST",
      url: "/v1/auth/session",
      payload: {
        email: complianceEmail,
        password,
        workspaceCode: "demo",
      },
    });

    complianceToken = (JSON.parse(session.body) as { data: { token: string } })
      .data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns compliance audit contract via /v1/compliance/audit", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/compliance/audit",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: {
        entries: Array<{ id: string; type: string; at: string }>;
        summary: { total: number; latestAt: string | null };
      };
    };

    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.entries)).toBe(true);
    expect(body.data.summary.total).toBe(body.data.entries.length);
  });

  it("returns discovery queue contract via /v1/sources/discovery-queue", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/sources/discovery-queue",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: {
        queue: Array<{ sourceUrl: string; riskLevel: string }>;
        summary: { total: number; highRisk: number };
      };
    };

    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.queue)).toBe(true);
    expect(body.data.summary.total).toBe(body.data.queue.length);
    expect(body.data.summary.highRisk).toBeGreaterThanOrEqual(0);
  });

  it("returns governance decisions contract via /v1/sources/governance-decisions", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/sources/governance-decisions",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: {
        decisions: Array<{ domain: string; sourceGovernanceState: string }>;
        summary: { total: number; reviewRequired: number };
      };
    };

    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.decisions)).toBe(true);
    expect(body.data.summary.total).toBe(body.data.decisions.length);
    expect(body.data.summary.reviewRequired).toBeGreaterThanOrEqual(0);
  });
});
