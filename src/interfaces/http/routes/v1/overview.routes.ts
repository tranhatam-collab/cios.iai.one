import type { FastifyInstance } from "fastify";

import { CEE_REASON_CODE_CATALOG } from "../../../../app/cee-lite.js";
import { ACTIONS, requireAction } from "../../../../app/permissions.js";
import {
  getComplianceAuditLog,
  getRetentionRules,
} from "../../../../repositories/compliance.repository.js";
import { listOrganizations } from "../../../../repositories/crm.repository.js";
import {
  getDiscoverySources,
  getGovernanceDecisions,
} from "../../../../repositories/discovery.repository.js";
import { listReviewItems } from "../../../../repositories/review-queue.repository.js";
import { envelopeOk } from "../../response-envelope.js";

export async function registerV1OverviewRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/overview", async (request, reply) => {
    const user = await requireAction(request, reply, ACTIONS.overviewRead);
    if (!user) return;

    const workspaceCode = user.workspaceCode;
    const workspaceId = user.workspaceId;

    const [
      orgs,
      auditEntries,
      retentionRules,
      discoveryQueue,
      governanceDecisions,
      reviewItems,
    ] = await Promise.all([
      listOrganizations({ workspaceCode }),
      getComplianceAuditLog(workspaceCode),
      getRetentionRules(workspaceCode),
      getDiscoverySources(workspaceCode),
      getGovernanceDecisions(workspaceCode),
      listReviewItems(workspaceId, "pending"),
    ]);

    return envelopeOk(request, {
      snapshotAt: new Date().toISOString(),
      workspace: {
        id: workspaceId,
        code: workspaceCode,
      },
      crm: {
        organizationsTotal: orgs.length,
        topOrganizations: orgs.slice(0, 5),
      },
      compliance: {
        auditTotal: auditEntries.length,
        recentAudit: auditEntries.slice(0, 5),
        retentionRuleTotal: retentionRules.length,
        retentionRules,
      },
      discovery: {
        queueTotal: discoveryQueue.length,
        governanceDecisionTotal: governanceDecisions.length,
        recentQueue: discoveryQueue.slice(0, 5),
        recentGovernance: governanceDecisions.slice(0, 5),
      },
      decision: {
        pendingReviewTotal: reviewItems.length,
        pendingReviews: reviewItems.slice(0, 5),
        reasonCodeCatalog: CEE_REASON_CODE_CATALOG,
        ui: {
          disableActionReasonCodes: [
            "deletion_pending",
            "suppression_active",
            "source_blocked",
            "record_compliance_blocked",
            "traceability_unsupported",
          ],
          reviewRequiredReasonCodes: [
            "review_pending",
            "action_class_manual_required",
            "borderline_confidence_or_inferred",
            "high_sensitivity_or_restricted_source",
          ],
        },
      },
      realtime: {
        streamPath: "/realtime/stream",
        replayPath: "/realtime/events/since/:eventId",
        status: "available",
      },
      status: {
        degradedMode: false,
        apiUnavailable: false,
        constitutionalReviewEnabled: true,
      },
    });
  });
}
