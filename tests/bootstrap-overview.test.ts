import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app/create-app.js";

describe("phase0 bootstrap + overview contracts", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let salesToken = "";
  let complianceToken = "";

  const password = "demo123456";
  const salesEmail = `qa-phase0-sales-${Date.now()}@iai.one`;
  const complianceEmail = `qa-phase0-compliance-${Date.now()}@iai.one`;

  beforeAll(async () => {
    app = await createApp();

    await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: salesEmail,
        password,
        displayName: "Phase0 Sales",
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
        displayName: "Phase0 Compliance",
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

  it("requires auth for bootstrap", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/bootstrap" });
    expect(res.statusCode).toBe(401);
  });

  it("returns bootstrap contract with role permissions and modules", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/bootstrap",
      headers: { authorization: `Bearer ${salesToken}` },
    });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: {
        user: { email: string; role: string };
        workspace: { code: string };
        context: { apiCompat: string; constitutionalMode: string };
        permissions: string[];
        nav: string[];
        modules: {
          crmSurface: boolean;
          complianceCenter: boolean;
          realtimeStream: boolean;
        };
        constitutional: {
          reasonCodes: Array<{
            code: string;
            category: string;
            meaning: string;
          }>;
        };
      };
    };

    expect(body.ok).toBe(true);
    expect(body.data.user.email).toBe(salesEmail);
    expect(body.data.user.role).toBe("sales_rep");
    expect(body.data.workspace.code).toBe("demo");
    expect(body.data.context.apiCompat).toBe("v1");
    expect(body.data.context.constitutionalMode).toBe("enforced");
    expect(body.data.permissions).toContain("bootstrap.read");
    expect(body.data.permissions).toContain("crm.organizations.read");
    expect(body.data.nav).toContain("overview");
    expect(body.data.modules.crmSurface).toBe(true);
    expect(body.data.modules.complianceCenter).toBe(true);
    expect(body.data.modules.realtimeStream).toBe(true);
    expect(
      body.data.constitutional.reasonCodes.some(
        (item) => item.code === "all_checks_passed",
      ),
    ).toBe(true);
  });

  it("returns overview contract with core working product surfaces", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/overview",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: {
        crm: { organizationsTotal: number; topOrganizations: unknown[] };
        compliance: { auditTotal: number; retentionRuleTotal: number };
        discovery: { queueTotal: number; governanceDecisionTotal: number };
        decision: {
          pendingReviewTotal: number;
          reasonCodeCatalog: Array<{ code: string }>;
          ui: {
            disableActionReasonCodes: string[];
            reviewRequiredReasonCodes: string[];
          };
        };
        realtime: { streamPath: string; replayPath: string; status: string };
        status: {
          degradedMode: boolean;
          apiUnavailable: boolean;
          constitutionalReviewEnabled: boolean;
        };
      };
    };

    expect(body.ok).toBe(true);
    expect(body.data.crm.organizationsTotal).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.data.crm.topOrganizations)).toBe(true);
    expect(body.data.compliance.auditTotal).toBeGreaterThanOrEqual(1);
    expect(body.data.compliance.retentionRuleTotal).toBeGreaterThanOrEqual(1);
    expect(body.data.discovery.queueTotal).toBeGreaterThanOrEqual(1);
    expect(body.data.discovery.governanceDecisionTotal).toBeGreaterThanOrEqual(
      1,
    );
    expect(body.data.decision.pendingReviewTotal).toBeGreaterThanOrEqual(0);
    expect(
      body.data.decision.reasonCodeCatalog.some(
        (item: { code: string }) => item.code === "suppression_active",
      ),
    ).toBe(true);
    expect(body.data.decision.ui.disableActionReasonCodes).toContain(
      "suppression_active",
    );
    expect(body.data.decision.ui.reviewRequiredReasonCodes).toContain(
      "review_pending",
    );
    expect(body.data.realtime.streamPath).toBe("/realtime/stream");
    expect(body.data.realtime.replayPath).toBe(
      "/realtime/events/since/:eventId",
    );
    expect(body.data.realtime.status).toBe("available");
    expect(body.data.status.degradedMode).toBe(false);
    expect(body.data.status.apiUnavailable).toBe(false);
    expect(body.data.status.constitutionalReviewEnabled).toBe(true);
  });
});
