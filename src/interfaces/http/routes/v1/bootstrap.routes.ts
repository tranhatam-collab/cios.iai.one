import type { FastifyInstance } from "fastify";

import {
  ACTIONS,
  getPermissionsForRole,
  requireAction,
} from "../../../../app/permissions.js";
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
      },
      permissions,
      nav: navByRole[role] ?? ["overview"],
      modules: moduleFlags,
    });
  });
}
