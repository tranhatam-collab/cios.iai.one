import type { FastifyInstance } from "fastify";

import {
  ACTIONS,
  getPermissionsForRole,
  requireAction,
} from "../../../../app/permissions.js";
import { CEE_REASON_CODE_CATALOG } from "../../../../app/cee-lite.js";
import { getReleaseInfo } from "../../../../core/release.js";
import { envelopeOk } from "../../response-envelope.js";

const navByRole: Record<string, string[]> = {
  owner: [
    "overview",
    "intelligence",
    "crm",
    "compliance",
    "decision",
    "workflow",
    "settings",
  ],
  admin: [
    "overview",
    "intelligence",
    "crm",
    "compliance",
    "decision",
    "workflow",
    "settings",
  ],
  compliance_admin: ["overview", "compliance", "decision", "workflow", "audit"],
  reviewer: ["overview", "decision", "compliance", "workflow"],
  sales_manager: ["overview", "intelligence", "crm", "decision", "workflow"],
  sales_rep: ["overview", "intelligence", "crm", "tasks"],
  analyst: ["overview", "intelligence", "crm", "discovery"],
  finance: ["overview", "compliance", "billing"],
  support: ["overview", "crm", "compliance"],
  readonly: ["overview", "intelligence", "crm", "compliance"],
};

const moduleFlags = {
  overview: true,
  intelligenceSearch: false,
  crmSurface: true,
  complianceCenter: true,
  decisionCenter: true,
  workflowConnect: true,
  realtimeStream: true,
  constitutionalLayer: true,
};

export async function registerV1BootstrapRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/bootstrap", async (request, reply) => {
    const user = await requireAction(request, reply, ACTIONS.bootstrapRead);
    if (!user) return;

    const release = getReleaseInfo();
    const role = user.role;
    const permissions = getPermissionsForRole(role);

    return envelopeOk(request, {
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
        role,
        plan: user.plan,
      },
      workspace: {
        id: user.workspaceId,
        code: user.workspaceCode,
      },
      context: {
        apiCompat: release.apiCompat,
        version: release.version,
        environment: release.environment,
        constitutionalMode: "enforced",
        constitutionalLayerVersion: "phase0-day6",
      },
      permissions,
      nav: navByRole[role] ?? ["overview"],
      modules: moduleFlags,
      constitutional: {
        actions: {
          flowDispatch: {
            requiresPolicyCheck: true,
            route: "/v1/compliance/cee/evaluate",
            decisions: ["allow", "deny", "review_required"],
          },
        },
        reasonCodes: CEE_REASON_CODE_CATALOG,
      },
      uiStateContracts: {
        disabledStates: [
          {
            key: "flow.dispatch.disabled",
            whenAnyReasonCodes: [
              "deletion_pending",
              "suppression_active",
              "source_blocked",
              "record_compliance_blocked",
              "traceability_unsupported",
            ],
          },
        ],
        reviewStates: [
          {
            key: "flow.dispatch.review_required",
            whenAnyReasonCodes: [
              "review_pending",
              "action_class_manual_required",
              "borderline_confidence_or_inferred",
              "high_sensitivity_or_restricted_source",
            ],
          },
        ],
      },
    });
  });
}
