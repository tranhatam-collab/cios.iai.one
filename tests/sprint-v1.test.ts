import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
        role: "sales_rep"
      }
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
        role: "compliance_admin"
      }
    });
    expect([200, 409]).toContain(registerCompliance.statusCode);

    const session = await app.inject({
      method: "POST",
      url: "/v1/auth/session",
      payload: {
        email,
        password,
        workspaceCode: "demo"
      }
    });
    expect(session.statusCode).toBe(200);
    const body = JSON.parse(session.body) as {
      ok: boolean;
      token: string;
      member: { email: string; plan: string };
    };
    expect(body.ok).toBe(true);
    expect(body.token.length).toBeGreaterThan(20);
    expect(body.member.email).toBe(email);
    salesToken = body.token;

    const complianceSession = await app.inject({
      method: "POST",
      url: "/v1/auth/session",
      payload: {
        email: complianceEmail,
        password,
        workspaceCode: "demo"
      }
    });
    expect(complianceSession.statusCode).toBe(200);
    const complianceBody = JSON.parse(complianceSession.body) as { token: string };
    complianceToken = complianceBody.token;

    const plans = await app.inject({ method: "GET", url: "/v1/members/plans" });
    expect(plans.statusCode).toBe(200);
    const plansBody = JSON.parse(plans.body) as { ok: boolean; plans: Array<{ id: string }> };
    expect(plansBody.ok).toBe(true);
    expect(plansBody.plans.some((plan) => plan.id === "enterprise")).toBe(true);
  });

  it("protects secured endpoints without JWT", async () => {
    const crmList = await app.inject({ method: "GET", url: "/v1/crm/organizations" });
    expect(crmList.statusCode).toBe(401);

    const complianceWithSalesRole = await app.inject({
      method: "GET",
      url: "/v1/compliance/audit-log",
      headers: { authorization: `Bearer ${salesToken}` }
    });
    expect(complianceWithSalesRole.statusCode).toBe(403);
  });

  it("returns crm list/detail and governance snapshots", async () => {
    const crmList = await app.inject({
      method: "GET",
      url: "/v1/crm/organizations",
      headers: { authorization: `Bearer ${salesToken}` }
    });
    expect(crmList.statusCode).toBe(200);
    const listBody = JSON.parse(crmList.body) as { ok: boolean; data: Array<{ id: string }> };
    expect(listBody.ok).toBe(true);
    expect(listBody.data.length).toBeGreaterThan(0);

    const crmDetail = await app.inject({
      method: "GET",
      url: `/v1/crm/organizations/${listBody.data[0]?.id}`,
      headers: { authorization: `Bearer ${salesToken}` }
    });
    expect(crmDetail.statusCode).toBe(200);

    const audit = await app.inject({
      method: "GET",
      url: "/v1/compliance/audit-log",
      headers: { authorization: `Bearer ${complianceToken}` }
    });
    expect(audit.statusCode).toBe(200);
    const auditBody = JSON.parse(audit.body) as { ok: boolean; entries: unknown[] };
    expect(auditBody.ok).toBe(true);
    expect(auditBody.entries.length).toBeGreaterThan(0);

    const discovery = await app.inject({
      method: "GET",
      url: "/v1/discovery/crawl-governance",
      headers: { authorization: `Bearer ${complianceToken}` }
    });
    expect(discovery.statusCode).toBe(200);
    const discoveryBody = JSON.parse(discovery.body) as { ok: boolean; decisions: unknown[] };
    expect(discoveryBody.ok).toBe(true);
    expect(discoveryBody.decisions.length).toBeGreaterThan(0);
  });

  it("returns auth audit trail for compliance role", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/auth/audit",
      headers: { authorization: `Bearer ${complianceToken}` }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { ok: boolean; entries: Array<{ event: string }> };
    expect(body.ok).toBe(true);
    expect(body.entries.length).toBeGreaterThan(0);
    expect(body.entries.some((entry) => entry.event === "login")).toBe(true);
  });
});
