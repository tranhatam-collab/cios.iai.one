import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app/create-app.js";

describe("tenant isolation and discovery governance hardening", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let complianceToken = "";

  const email = `qa-tenant-${Date.now()}@iai.one`;
  const password = "demo123456";

  beforeAll(async () => {
    app = await createApp();

    await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email,
        password,
        displayName: "Tenant Compliance",
        workspaceCode: "demo",
        role: "compliance_admin",
      },
    });

    const session = await app.inject({
      method: "POST",
      url: "/v1/auth/session",
      payload: {
        email,
        password,
        workspaceCode: "demo",
      },
    });

    const body = JSON.parse(session.body) as { data: { token: string } };
    complianceToken = body.data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns hardened discovery source state fields", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/discovery/sources",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: {
        queue: Array<{
          candidateType: string;
          discoveryMethod: string;
          preliminaryConfidence: number;
          governanceState: string;
          reviewStatus: string;
          workspaceRelevance: string;
          geoHints: string[];
          languageHints: string[];
        }>;
      };
    };
    expect(body.ok).toBe(true);
    expect(body.data.queue.length).toBeGreaterThan(0);
    expect(body.data.queue[0]?.candidateType).toBeTruthy();
    expect(body.data.queue[0]?.discoveryMethod).toBeTruthy();
    expect(typeof body.data.queue[0]?.preliminaryConfidence).toBe("number");
    expect(body.data.queue[0]?.governanceState).toBeTruthy();
    expect(Array.isArray(body.data.queue[0]?.geoHints)).toBe(true);
    expect(Array.isArray(body.data.queue[0]?.languageHints)).toBe(true);
  });

  it("returns hardened governance decision state fields", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/discovery/crawl-governance",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: {
        decisions: Array<{
          sourceGovernanceState: string;
          actor: string;
          legalRiskLevel: string;
          complianceClass: string;
        }>;
      };
    };
    expect(body.ok).toBe(true);
    expect(body.data.decisions.length).toBeGreaterThan(0);
    expect(body.data.decisions[0]?.sourceGovernanceState).toBeTruthy();
    expect(body.data.decisions[0]?.actor).toBeTruthy();
    expect(body.data.decisions[0]?.legalRiskLevel).toBeTruthy();
    expect(body.data.decisions[0]?.complianceClass).toBeTruthy();
  });

  it("rejects signed callback when workspace header is missing", async () => {
    const dispatch = await app.inject({
      method: "POST",
      url: "/v1/flow/dispatch",
      headers: { authorization: `Bearer ${complianceToken}` },
      payload: {
        triggerName: "workspace.header.required",
        sourceDecisionId: "dec_workspace_header_001",
        priority: "high",
        payload: { reason: "missing workspace header" },
        approvedBy: "compliance_lead",
      },
    });
    expect(dispatch.statusCode).toBe(200);
    const dispatchBody = JSON.parse(dispatch.body) as {
      data: { run: { id: string } };
    };

    const cryptoModule = await import("node:crypto");
    const callbackPayload = {
      flowRunId: dispatchBody.data.run.id,
      status: "success",
      payload: { done: true },
    };
    const signature = cryptoModule
      .createHmac("sha256", process.env.FLOW_WEBHOOK_SECRET ?? "")
      .update(JSON.stringify(callbackPayload))
      .digest("hex");

    const res = await app.inject({
      method: "POST",
      url: "/v1/flow/callback",
      headers: {
        "x-flow-signature": signature,
      },
      payload: callbackPayload,
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as {
      ok: boolean;
      error: { code: string };
    };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });
});
