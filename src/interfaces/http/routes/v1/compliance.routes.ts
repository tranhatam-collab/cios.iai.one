import type { FastifyInstance } from "fastify";

import { requireRoles } from "../../../../app/auth-guard.js";
import {
  getComplianceAuditLog,
  getCompliancePolicies,
  getRetentionRules
} from "../../../../repositories/compliance.repository.js";

export async function registerV1ComplianceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/compliance/policies", async () => {
    const policies = getCompliancePolicies();
    return {
      ok: true,
      policies,
      controls: ["audit-logs", "retention-rules", "source-lineage", "robots-compliance-check", "review-queue"]
    };
  });

  app.get("/compliance/audit-log", async (request, reply) => {
    const user = await requireRoles(request, reply, ["owner", "admin", "compliance_admin"]);
    if (!user) return;
    const workspaceCode = user.workspaceCode ?? "demo";
    const entries = await getComplianceAuditLog(workspaceCode);
    return {
      ok: true,
      entries
    };
  });

  app.get("/compliance/retention-rules", async (request, reply) => {
    const user = await requireRoles(request, reply, ["owner", "admin", "compliance_admin"]);
    if (!user) return;
    const workspaceCode = user.workspaceCode ?? "demo";
    const rules = await getRetentionRules(workspaceCode);
    return {
      ok: true,
      rules
    };
  });
}
