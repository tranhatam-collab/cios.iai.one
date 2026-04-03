import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app/create-app.js";

describe("phase1 integration gates", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let salesRepToken = "";
  let complianceToken = "";

  const password = "demo123456";
  const salesEmail = `qa-phase1-sales-${Date.now()}@iai.one`;
  const complianceEmail = `qa-phase1-compliance-${Date.now()}@iai.one`;

  beforeAll(async () => {
    app = await createApp();

    await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: salesEmail,
        password,
        displayName: "Phase1 Sales",
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
        displayName: "Phase1 Compliance",
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
    const salesBody = JSON.parse(salesSession.body) as {
      data: { token: string };
    };
    salesRepToken = salesBody.data.token;

    const complianceSession = await app.inject({
      method: "POST",
      url: "/v1/auth/session",
      payload: {
        email: complianceEmail,
        password,
        workspaceCode: "demo",
      },
    });
    const complianceBody = JSON.parse(complianceSession.body) as {
      data: { token: string };
    };
    complianceToken = complianceBody.data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("enforces auth on realtime replay endpoint", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/realtime/events/since/unknown-event-id",
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body) as {
      ok: boolean;
      error: { code: string };
    };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("AUTH_UNAUTHORIZED");
  });

  it("enforces permission matrix for realtime replay endpoint", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/realtime/events/since/unknown-event-id",
      headers: { authorization: `Bearer ${salesRepToken}` },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as {
      ok: boolean;
      error: { code: string; details: { action: string } };
    };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("AUTH_FORBIDDEN");
    expect(body.error.details.action).toBe("realtime.stream.read");
  });

  it("replays only events after a given event id", async () => {
    const firstEvent = await app.inject({
      method: "POST",
      url: "/v1/compliance/cee/evaluate",
      headers: { authorization: `Bearer ${complianceToken}` },
      payload: {
        actionType: "flow.dispatch",
        actionClass: "auto_safe",
        targetObjectType: "organization",
        targetObjectId: "org_demo",
        targetRecordConfidence: 95,
        targetTraceabilityStatus: "source_backed",
        targetComplianceStatus: "ok",
        targetSourceGovernanceState: "allowed",
        reviewStatus: "none",
        suppressionStatus: "inactive",
        exportSensitivity: "low",
      },
    });
    expect(firstEvent.statusCode).toBe(200);

    const allRes = await app.inject({
      method: "GET",
      url: "/realtime/events/since/unknown-event-id",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(allRes.statusCode).toBe(200);
    const allBody = JSON.parse(allRes.body) as {
      ok: boolean;
      data: { events: Array<{ event_id: string; event_type: string }> };
    };
    expect(allBody.ok).toBe(true);
    const checkpointEvent = allBody.data.events.find(
      (event) => event.event_type === "compliance.updated",
    );
    expect(checkpointEvent?.event_id).toBeTruthy();

    const secondEvent = await app.inject({
      method: "POST",
      url: "/v1/compliance/cee/evaluate",
      headers: { authorization: `Bearer ${complianceToken}` },
      payload: {
        actionType: "flow.dispatch",
        actionClass: "auto_safe",
        targetObjectType: "organization",
        targetObjectId: "org_demo",
        targetRecordConfidence: 95,
        targetTraceabilityStatus: "source_backed",
        targetComplianceStatus: "ok",
        targetSourceGovernanceState: "allowed",
        reviewStatus: "none",
        suppressionStatus: "inactive",
        exportSensitivity: "low",
      },
    });
    expect(secondEvent.statusCode).toBe(200);

    const sinceRes = await app.inject({
      method: "GET",
      url: `/realtime/events/since/${checkpointEvent!.event_id}`,
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(sinceRes.statusCode).toBe(200);
    const sinceBody = JSON.parse(sinceRes.body) as {
      ok: boolean;
      data: {
        total: number;
        events: Array<{ event_id: string; event_type: string }>;
      };
    };
    expect(sinceBody.ok).toBe(true);
    expect(sinceBody.data.total).toBeGreaterThanOrEqual(1);
    expect(
      sinceBody.data.events.some(
        (event) =>
          event.event_type === "compliance.updated" &&
          event.event_id !== checkpointEvent!.event_id,
      ),
    ).toBe(true);
  });

  it("enforces permission matrix for flow dispatch", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/flow/dispatch",
      headers: { authorization: `Bearer ${salesRepToken}` },
      payload: {
        triggerName: "risk.escalation",
        sourceDecisionId: "dec_forbidden_001",
        priority: "high",
        payload: { reason: "forbidden-check" },
        approvedBy: "manager",
      },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as {
      ok: boolean;
      error: { code: string; details: { action: string } };
    };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("AUTH_FORBIDDEN");
    expect(body.error.details.action).toBe("flow.dispatch.write");
  });

  it("rejects flow callback when signature is missing or invalid", async () => {
    const dispatch = await app.inject({
      method: "POST",
      url: "/v1/flow/dispatch",
      headers: { authorization: `Bearer ${complianceToken}` },
      payload: {
        triggerName: "signature.validation",
        sourceDecisionId: "dec_sig_001",
        priority: "high",
        payload: { reason: "signature-check" },
        approvedBy: "compliance_lead",
      },
    });
    expect(dispatch.statusCode).toBe(200);
    const dispatchBody = JSON.parse(dispatch.body) as {
      data: { run: { id: string; workspaceId: string } };
    };

    const missingSignature = await app.inject({
      method: "POST",
      url: "/v1/flow/callback",
      payload: {
        flowRunId: dispatchBody.data.run.id,
        status: "success",
        payload: { done: true },
      },
    });
    expect(missingSignature.statusCode).toBe(401);

    const invalidSignature = await app.inject({
      method: "POST",
      url: "/v1/flow/callback",
      headers: {
        "x-flow-signature": "deadbeef",
        "x-workspace-id": dispatchBody.data.run.workspaceId,
      },
      payload: {
        flowRunId: dispatchBody.data.run.id,
        status: "success",
        payload: { done: true },
      },
    });
    expect(invalidSignature.statusCode).toBe(401);
  });

  it("accepts flow callback with valid signature", async () => {
    const dispatch = await app.inject({
      method: "POST",
      url: "/v1/flow/dispatch",
      headers: { authorization: `Bearer ${complianceToken}` },
      payload: {
        triggerName: "signature.validation.ok",
        sourceDecisionId: "dec_sig_002",
        priority: "high",
        payload: { reason: "signature-ok" },
        approvedBy: "compliance_lead",
      },
    });
    expect(dispatch.statusCode).toBe(200);
    const dispatchBody = JSON.parse(dispatch.body) as {
      data: { run: { id: string; workspaceId: string } };
    };

    const callbackPayload = {
      flowRunId: dispatchBody.data.run.id,
      status: "success",
      payload: { done: true },
    };
    const rawBody = JSON.stringify(callbackPayload);
    const cryptoModule = await import("node:crypto");
    const signature = cryptoModule
      .createHmac("sha256", process.env.FLOW_WEBHOOK_SECRET ?? "")
      .update(rawBody)
      .digest("hex");

    const validSignature = await app.inject({
      method: "POST",
      url: "/v1/flow/callback",
      headers: {
        "x-flow-signature": signature,
        "x-workspace-id": dispatchBody.data.run.workspaceId,
      },
      payload: callbackPayload,
    });
    expect(validSignature.statusCode).toBe(200);
    const body = JSON.parse(validSignature.body) as {
      ok: boolean;
      data: { run: { status: string } };
    };
    expect(body.ok).toBe(true);
    expect(body.data.run.status).toBe("success");
  });
});
