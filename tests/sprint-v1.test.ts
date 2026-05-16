import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

import { createApp } from "../src/app/create-app.js";

describe("sprint v1 expansion routes", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let salesToken = "";
  let complianceToken = "";
  const email = `qa-sales-${Date.now()}@iai.one`;
  const complianceEmail = `qa-compliance-${Date.now()}@iai.one`;
  const password = "demo123456";

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers and creates auth session, then returns member plans", async () => {
    const register = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email,
        password,
        displayName: "QA Member",
        workspaceCode: "demo",
        role: "sales_rep",
      },
    });
    expect([200, 409]).toContain(register.statusCode);

    const registerCompliance = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: complianceEmail,
        password,
        displayName: "QA Compliance",
        workspaceCode: "demo",
        role: "compliance_admin",
      },
    });
    expect([200, 409]).toContain(registerCompliance.statusCode);

    const session = await app.inject({
      method: "POST",
      url: "/v1/auth/session",
      payload: {
        email,
        password,
        workspaceCode: "demo",
      },
    });
    expect(session.statusCode).toBe(200);
    const body = JSON.parse(session.body) as {
      ok: boolean;
      data: {
        token: string;
        member: { email: string; plan: string };
      };
    };
    expect(body.ok).toBe(true);
    expect(body.data.token.length).toBeGreaterThan(20);
    expect(body.data.member.email).toBe(email);
    salesToken = body.data.token;

    const complianceSession = await app.inject({
      method: "POST",
      url: "/v1/auth/session",
      payload: {
        email: complianceEmail,
        password,
        workspaceCode: "demo",
      },
    });
    expect(complianceSession.statusCode).toBe(200);
    const complianceBody = JSON.parse(complianceSession.body) as {
      data: { token: string };
    };
    complianceToken = complianceBody.data.token;

    const plans = await app.inject({
      method: "GET",
      url: "/v1/members/plans",
      headers: { authorization: `Bearer ${salesToken}` },
    });
    expect(plans.statusCode).toBe(200);
    const plansBody = JSON.parse(plans.body) as {
      ok: boolean;
      data: { plans: Array<{ id: string }> };
    };
    expect(plansBody.ok).toBe(true);
    expect(plansBody.data.plans.some((plan) => plan.id === "enterprise")).toBe(
      true,
    );
  });

  it("protects secured endpoints without JWT", async () => {
    const crmList = await app.inject({
      method: "GET",
      url: "/v1/crm/organizations",
    });
    expect(crmList.statusCode).toBe(401);

    const complianceWithSalesRole = await app.inject({
      method: "GET",
      url: "/v1/compliance/audit-log",
      headers: { authorization: `Bearer ${salesToken}` },
    });
    expect(complianceWithSalesRole.statusCode).toBe(403);
  });

  it("returns crm list/detail and governance snapshots", async () => {
    const crmList = await app.inject({
      method: "GET",
      url: "/v1/crm/organizations?page=1&page_size=2",
      headers: { authorization: `Bearer ${salesToken}` },
    });
    expect(crmList.statusCode).toBe(200);
    const listBody = JSON.parse(crmList.body) as {
      ok: boolean;
      data: {
        organizations: Array<{ id: string }>;
        total: number;
        page: number;
        page_size: number;
      };
    };
    expect(listBody.ok).toBe(true);
    expect(listBody.data.page).toBe(1);
    expect(listBody.data.page_size).toBe(2);
    expect(listBody.data.total).toBeGreaterThanOrEqual(
      listBody.data.organizations.length,
    );
    expect(listBody.data.organizations.length).toBeLessThanOrEqual(2);
    expect(listBody.data.organizations.length).toBeGreaterThan(0);

    const crmDetail = await app.inject({
      method: "GET",
      url: `/v1/crm/organizations/${listBody.data.organizations[0]?.id}`,
      headers: { authorization: `Bearer ${salesToken}` },
    });
    expect(crmDetail.statusCode).toBe(200);

    const audit = await app.inject({
      method: "GET",
      url: "/v1/compliance/audit",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(audit.statusCode).toBe(200);
    const auditBody = JSON.parse(audit.body) as {
      ok: boolean;
      data: { entries: unknown[]; summary: { total: number } };
    };
    expect(auditBody.ok).toBe(true);
    expect(auditBody.data.entries.length).toBeGreaterThan(0);
    expect(auditBody.data.summary.total).toBe(auditBody.data.entries.length);

    const discovery = await app.inject({
      method: "GET",
      url: "/v1/sources/governance-decisions",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(discovery.statusCode).toBe(200);
    const discoveryBody = JSON.parse(discovery.body) as {
      ok: boolean;
      data: { decisions: unknown[]; summary: { total: number } };
    };
    expect(discoveryBody.ok).toBe(true);
    expect(discoveryBody.data.decisions.length).toBeGreaterThan(0);
    expect(discoveryBody.data.summary.total).toBe(
      discoveryBody.data.decisions.length,
    );
  });

  it("returns auth audit trail for compliance role", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/auth/audit",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: { entries: Array<{ event: string }> };
    };
    expect(body.ok).toBe(true);
    expect(body.data.entries.length).toBeGreaterThan(0);
    expect(body.data.entries.some((entry) => entry.event === "login")).toBe(
      true,
    );
  });

  it("evaluates sensitive action with CEE-lite", async () => {
    const denied = await app.inject({
      method: "POST",
      url: "/v1/compliance/cee/evaluate",
      headers: { authorization: `Bearer ${complianceToken}` },
      payload: {
        actionType: "flow.dispatch",
        actionClass: "manual_required",
        targetObjectType: "organization",
        targetObjectId: "org_demo",
        targetRecordConfidence: 88,
        targetTraceabilityStatus: "source_backed",
        targetComplianceStatus: "ok",
        targetSourceGovernanceState: "allowed",
        reviewStatus: "none",
        suppressionStatus: "active",
        exportSensitivity: "high",
      },
    });
    expect(denied.statusCode).toBe(403);
    const deniedBody = JSON.parse(denied.body) as {
      ok: boolean;
      error: { code: string; details: { decision: string } };
    };
    expect(deniedBody.ok).toBe(false);
    expect(deniedBody.error.code).toBe("COMPLIANCE_DENIED");
    expect(deniedBody.error.details.decision).toBe("deny");

    const reviewRequired = await app.inject({
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
    expect(reviewRequired.statusCode).toBe(202);
    const reviewBody = JSON.parse(reviewRequired.body) as {
      ok: boolean;
      error: {
        code: string;
        details: {
          decision: { decision: string };
          review_item_id?: string;
        };
      };
    };
    expect(reviewBody.ok).toBe(false);
    expect(reviewBody.error.code).toBe("COMPLIANCE_REVIEW_REQUIRED");
    expect(reviewBody.error.details.decision.decision).toBe("review_required");
    expect(reviewBody.error.details.review_item_id).toBeTruthy();

    const reviewId = reviewBody.error.details.review_item_id as string;

    const reviewList = await app.inject({
      method: "GET",
      url: "/v1/reviews?status=pending",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(reviewList.statusCode).toBe(200);
    const reviewListBody = JSON.parse(reviewList.body) as {
      ok: boolean;
      data: { items: Array<{ id: string; resolutionStatus: string }> };
    };
    expect(reviewListBody.ok).toBe(true);
    expect(reviewListBody.data.items.some((item) => item.id === reviewId)).toBe(
      true,
    );

    const resolve = await app.inject({
      method: "POST",
      url: `/v1/reviews/${reviewId}/resolve`,
      headers: { authorization: `Bearer ${complianceToken}` },
      payload: {
        decision: "approved",
        note: "Approved by compliance reviewer",
      },
    });
    expect(resolve.statusCode).toBe(200);
    const resolveBody = JSON.parse(resolve.body) as {
      ok: boolean;
      data: { item: { id: string; resolutionStatus: string } };
    };
    expect(resolveBody.ok).toBe(true);
    expect(resolveBody.data.item.id).toBe(reviewId);
    expect(resolveBody.data.item.resolutionStatus).toBe("approved");

    const allowed = await app.inject({
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
    expect(allowed.statusCode).toBe(200);
    const allowBody = JSON.parse(allowed.body) as {
      ok: boolean;
      data: { decision: { decision: string } };
    };
    expect(allowBody.ok).toBe(true);
    expect(allowBody.data.decision.decision).toBe("allow");
  });

  it("creates and updates flow runs for realtime flow.updated path", async () => {
    const dispatch = await app.inject({
      method: "POST",
      url: "/v1/flow/dispatch",
      headers: { authorization: `Bearer ${complianceToken}` },
      payload: {
        triggerName: "risk.escalation",
        sourceDecisionId: "dec_001",
        priority: "high",
        payload: { reason: "test" },
        approvedBy: "compliance_lead",
      },
    });
    expect(dispatch.statusCode).toBe(200);
    const dispatchBody = JSON.parse(dispatch.body) as {
      ok: boolean;
      data: { run: { id: string; status: string; workspaceId: string } };
    };
    expect(dispatchBody.ok).toBe(true);
    expect(dispatchBody.data.run.status).toBe("accepted");

    const callback = await app.inject({
      method: "POST",
      url: "/v1/flow/callback",
      headers: {
        "x-workspace-id": dispatchBody.data.run.workspaceId,
        "x-flow-signature": createHmac(
          "sha256",
          process.env.FLOW_WEBHOOK_SECRET ?? "",
        )
          .update(
            JSON.stringify({
              flowRunId: dispatchBody.data.run.id,
              status: "success",
              payload: { completed: true },
            }),
          )
          .digest("hex"),
      },
      payload: {
        flowRunId: dispatchBody.data.run.id,
        status: "success",
        payload: { completed: true },
      },
    });
    expect(callback.statusCode).toBe(200);
    const callbackBody = JSON.parse(callback.body) as {
      ok: boolean;
      data: { run: { status: string } };
    };
    expect(callbackBody.ok).toBe(true);
    expect(callbackBody.data.run.status).toBe("success");
  });

  it("returns persisted realtime events since event id fallback endpoint", async () => {
    const create = await app.inject({
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
    expect(create.statusCode).toBe(200);

    const sinceUnknown = await app.inject({
      method: "GET",
      url: "/realtime/events/since/unknown-event-id",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(sinceUnknown.statusCode).toBe(200);
    const sinceBody = JSON.parse(sinceUnknown.body) as {
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
        (event) => event.event_type === "compliance.updated",
      ),
    ).toBe(true);

    const firstEventId = sinceBody.data.events[0]?.event_id;
    const sinceKnown = await app.inject({
      method: "GET",
      url: `/realtime/events/since/${firstEventId}`,
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(sinceKnown.statusCode).toBe(200);
  });
});
