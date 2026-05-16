import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app/create-app.js";

describe("phase0 day6 constitutional review + ui state contracts", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let complianceToken = "";

  const password = "demo123456";
  const complianceEmail = `qa-phase0-day6-${Date.now()}@iai.one`;

  beforeAll(async () => {
    app = await createApp();

    await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: complianceEmail,
        password,
        displayName: "Phase0 Day6 Compliance",
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

  it("exposes constitutional reason code + ui state mapping in bootstrap", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/bootstrap",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: {
        context: {
          constitutionalMode: string;
          constitutionalLayerVersion: string;
        };
        constitutional: {
          reasonCodes: Array<{
            code: string;
            category: string;
            meaning: string;
          }>;
        };
        uiStateContracts: {
          disabledStates: Array<{ key: string; whenAnyReasonCodes: string[] }>;
          reviewStates: Array<{ key: string; whenAnyReasonCodes: string[] }>;
        };
      };
    };

    expect(body.ok).toBe(true);
    expect(body.data.context.constitutionalMode).toBe("enforced");
    expect(body.data.context.constitutionalLayerVersion).toBe("phase0-day6");
    expect(body.data.constitutional.reasonCodes.length).toBeGreaterThan(3);
    expect(
      body.data.constitutional.reasonCodes.some(
        (item) => item.code === "suppression_active",
      ),
    ).toBe(true);
    expect(
      body.data.uiStateContracts.disabledStates[0]?.whenAnyReasonCodes,
    ).toContain("suppression_active");
    expect(
      body.data.uiStateContracts.reviewStates[0]?.whenAnyReasonCodes,
    ).toContain("review_pending");
  });

  it("exposes disable/review reason groups in overview", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/overview",
      headers: { authorization: `Bearer ${complianceToken}` },
    });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: {
        decision: {
          reasonCodeCatalog: Array<{ code: string }>;
          ui: {
            disableActionReasonCodes: string[];
            reviewRequiredReasonCodes: string[];
          };
        };
        status: { constitutionalReviewEnabled: boolean };
      };
    };

    expect(body.ok).toBe(true);
    expect(body.data.status.constitutionalReviewEnabled).toBe(true);
    expect(body.data.decision.reasonCodeCatalog.length).toBeGreaterThan(3);
    expect(body.data.decision.ui.disableActionReasonCodes).toContain(
      "source_blocked",
    );
    expect(body.data.decision.ui.reviewRequiredReasonCodes).toContain(
      "high_sensitivity_or_restricted_source",
    );
  });
});
