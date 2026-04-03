import type { FastifyReply, FastifyRequest } from "fastify";

import { ERROR_CODES } from "./error-codes.js";
import {
  requireAuth,
  type WorkspaceRole,
  type TokenUser,
} from "./auth-guard.js";
import { envelopeError } from "../interfaces/http/response-envelope.js";

export const ACTIONS = {
  authAuditRead: "auth.audit.read",
  memberPlansRead: "member.plans.read",
  crmOrganizationsRead: "crm.organizations.read",
  crmOrganizationRead: "crm.organization.read",
  compliancePoliciesRead: "compliance.policies.read",
  complianceAuditRead: "compliance.audit.read",
  complianceRetentionRead: "compliance.retention.read",
  complianceActionEvaluate: "compliance.action.evaluate",
  reviewQueueRead: "review.queue.read",
  reviewQueueResolve: "review.queue.resolve",
  realtimeStreamRead: "realtime.stream.read",
  flowDispatchWrite: "flow.dispatch.write",
  flowCallbackWrite: "flow.callback.write",
  discoverySourcesRead: "discovery.sources.read",
  discoveryGovernanceRead: "discovery.governance.read",
} as const;

export type AppAction = (typeof ACTIONS)[keyof typeof ACTIONS];

const permissionMatrix: Record<AppAction, WorkspaceRole[]> = {
  [ACTIONS.authAuditRead]: ["owner", "admin", "compliance_admin"],
  [ACTIONS.memberPlansRead]: [
    "owner",
    "admin",
    "compliance_admin",
    "sales_manager",
    "sales_rep",
    "analyst",
    "reviewer",
    "finance",
    "support",
    "readonly",
  ],
  [ACTIONS.crmOrganizationsRead]: [
    "owner",
    "admin",
    "sales_manager",
    "sales_rep",
  ],
  [ACTIONS.crmOrganizationRead]: [
    "owner",
    "admin",
    "sales_manager",
    "sales_rep",
  ],
  [ACTIONS.compliancePoliciesRead]: [
    "owner",
    "admin",
    "compliance_admin",
    "sales_manager",
    "sales_rep",
    "analyst",
    "reviewer",
    "finance",
    "support",
    "readonly",
  ],
  [ACTIONS.complianceAuditRead]: ["owner", "admin", "compliance_admin"],
  [ACTIONS.complianceRetentionRead]: ["owner", "admin", "compliance_admin"],
  [ACTIONS.complianceActionEvaluate]: [
    "owner",
    "admin",
    "compliance_admin",
    "sales_manager",
  ],
  [ACTIONS.reviewQueueRead]: [
    "owner",
    "admin",
    "compliance_admin",
    "reviewer",
    "sales_manager",
  ],
  [ACTIONS.reviewQueueResolve]: [
    "owner",
    "admin",
    "compliance_admin",
    "reviewer",
  ],
  [ACTIONS.realtimeStreamRead]: [
    "owner",
    "admin",
    "compliance_admin",
    "reviewer",
    "sales_manager",
  ],
  [ACTIONS.flowDispatchWrite]: [
    "owner",
    "admin",
    "compliance_admin",
    "sales_manager",
  ],
  [ACTIONS.flowCallbackWrite]: [
    "owner",
    "admin",
    "compliance_admin",
    "reviewer",
    "sales_manager",
  ],
  [ACTIONS.discoverySourcesRead]: [
    "owner",
    "admin",
    "compliance_admin",
    "sales_manager",
  ],
  [ACTIONS.discoveryGovernanceRead]: [
    "owner",
    "admin",
    "compliance_admin",
    "sales_manager",
  ],
};

export function getAllowedRoles(action: AppAction): WorkspaceRole[] {
  return permissionMatrix[action];
}

export async function requireAction(
  request: FastifyRequest,
  reply: FastifyReply,
  action: AppAction,
): Promise<TokenUser | null> {
  const user = await requireAuth(request, reply);
  if (!user) {
    return null;
  }

  const allowedRoles = getAllowedRoles(action);
  const isAllowed = allowedRoles.includes(user.role);
  if (!isAllowed) {
    await reply.status(403).send(
      envelopeError(request, {
        code: ERROR_CODES.authForbidden,
        message: "Role is not allowed for this action.",
        details: {
          action,
          allowed_roles: allowedRoles,
        },
      }),
    );
    return null;
  }

  return user;
}
