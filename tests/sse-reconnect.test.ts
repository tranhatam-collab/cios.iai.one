import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app/create-app.js";

describe("SSE auth and reconnect behavior", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let salesToken = "";
  let complianceToken = "";

  const password = "demo123456";
  const salesEmail = `qa-sse-sales-${Date.now()}@iai.one`;
  const complianceEmail = `qa-sse-compliance-${Date.now()}@iai.one`;

  beforeAll(async () => {
    app = await createApp();

    await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: salesEmail,
        password,
        displayName: "SSE Sales",
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
        displayName: "SSE Compliance",
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

  it("enforces auth/permission on realtime stream endpoint", async () => {
    const unauth = await app.inject({
      method: "GET",
      url: "/realtime/stream",
    });
    expect(unauth.statusCode).toBe(401);

    const forbidden = await app.inject({
      method: "GET",
      url: "/realtime/stream",
      headers: { authorization: `Bearer ${salesToken}` },
    });
    expect(forbidden.statusCode).toBe(403);
  });

  it("supports reconnect fallback by event id with ordered new events", async () => {
    const seed = await app.inject({
      method: "POST",
      url: "/v1/compliance/cee/evaluate",
      headers: { authorization: `Bearer ${complianceToken}` },
      payload: {
        actionType: "flow.dispatch",
        actionClass: "auto_with_guardrails",
        targetObjectType: "organization",
        targetObjectId: "org_demo",
        targetRecordConfidence: 95,
        targetTraceabilityStatus: "source_backed",
        targetComplianceStatus: "ok",
        targetSourceGovernanceState: "allowed_with_limits",
        reviewStatus: "none",
        suppressionStatus: "inactive",
        exportSensitivity: "high",
      },
    });
    expect(seed.statusCode).toBe(202);

    const listBefore = await app.inject({
      method: "GET",
      url: "/realtime/events/since/unknown-event-id",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(listBefore.statusCode).toBe(200);
    const beforeBody = JSON.parse(listBefore.body) as {
      data: {
        events: Array<{
          event_id: string;
          event_type: string;
          object_id: string;
        }>;
      };
    };
    const checkpoint = beforeBody.data.events.find(
      (event) => event.event_type === "review.created",
    );
    expect(checkpoint?.event_id).toBeTruthy();

    const dispatch = await app.inject({
      method: "POST",
      url: "/v1/flow/dispatch",
      headers: { authorization: `Bearer ${complianceToken}` },
      payload: {
        triggerName: "sse.reconnect.flow",
        sourceDecisionId: "dec_sse_001",
        priority: "high",
        payload: { reason: "sse reconnect" },
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
      payload: { completed: true },
    };
    const signature = createHmac(
      "sha256",
      process.env.FLOW_WEBHOOK_SECRET ?? "",
    )
      .update(JSON.stringify(callbackPayload))
      .digest("hex");

    const callback = await app.inject({
      method: "POST",
      url: "/v1/flow/callback",
      headers: {
        "x-flow-signature": signature,
        "x-workspace-id": dispatchBody.data.run.workspaceId,
      },
      payload: callbackPayload,
    });
    expect(callback.statusCode).toBe(200);

    const listAfter = await app.inject({
      method: "GET",
      url: `/realtime/events/since/${checkpoint!.event_id}`,
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(listAfter.statusCode).toBe(200);
    const afterBody = JSON.parse(listAfter.body) as {
      ok: boolean;
      data: {
        events: Array<{
          event_id: string;
          event_type: string;
          object_id: string;
        }>;
      };
    };
    expect(afterBody.ok).toBe(true);
    expect(
      afterBody.data.events.some(
        (event) =>
          event.event_type === "flow.updated" &&
          event.object_id === dispatchBody.data.run.id,
      ),
    ).toBe(true);
    expect(
      afterBody.data.events.some(
        (event) =>
          event.event_type === "review.created" &&
          event.event_id === checkpoint!.event_id,
      ),
    ).toBe(false);
  });
});
