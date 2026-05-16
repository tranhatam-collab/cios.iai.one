import type { FastifyInstance } from "fastify";

import { ACTIONS, requireAction } from "../../../../app/permissions.js";
import {
  getComplianceAuditLog,
  getCompliancePolicies,
  getRetentionRules,
} from "../../../../repositories/compliance.repository.js";
import { envelopeOk } from "../../response-envelope.js";

export async function registerV1ComplianceRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/compliance/policies", async (request) => {
    const policies = getCompliancePolicies();
    return envelopeOk(request, {
      policies,
      controls: [
        "audit-logs",
        "retention-rules",
        "source-lineage",
        "robots-compliance-check",
        "review-queue",
      ],
    });
  });

  app.get("/compliance/audit", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.complianceAuditRead,
    );
    if (!user) return;
    const workspaceCode = user.workspaceCode ?? "demo";
    const entries = await getComplianceAuditLog(workspaceCode);
    return envelopeOk(request, {
      entries,
      summary: {
        total: entries.length,
        latestAt: entries[0]?.at ?? null,
      },
    });
  });

  app.get("/compliance/audit-log", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.complianceAuditRead,
    );
    if (!user) return;
    const workspaceCode = user.workspaceCode ?? "demo";
    const entries = await getComplianceAuditLog(workspaceCode);
    return envelopeOk(request, {
      entries,
      summary: {
        total: entries.length,
        latestAt: entries[0]?.at ?? null,
      },
    });
  });

  app.get("/compliance/retention-rules", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.complianceRetentionRead,
    );
    if (!user) return;
    const workspaceCode = user.workspaceCode ?? "demo";
    const rules = await getRetentionRules(workspaceCode);
    return envelopeOk(request, { rules });
  });
}
