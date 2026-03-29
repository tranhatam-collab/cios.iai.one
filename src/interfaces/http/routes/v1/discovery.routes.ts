import type { FastifyInstance } from "fastify";

import { requireRoles } from "../../../../app/auth-guard.js";
import { getDiscoverySources, getGovernanceDecisions } from "../../../../repositories/discovery.repository.js";

export async function registerV1DiscoveryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/discovery/sources", async (request, reply) => {
    const user = await requireRoles(request, reply, ["owner", "admin", "compliance_admin", "sales_manager"]);
    if (!user) return;
    const workspaceCode = user.workspaceCode ?? "demo";
    const queue = await getDiscoverySources(workspaceCode);
    return {
      ok: true,
      queue
    };
  });

  app.get("/discovery/crawl-governance", async (request, reply) => {
    const user = await requireRoles(request, reply, ["owner", "admin", "compliance_admin", "sales_manager"]);
    if (!user) return;
    const workspaceCode = user.workspaceCode ?? "demo";
    const decisions = await getGovernanceDecisions(workspaceCode);
    return {
      ok: true,
      policy: {
        robotsCompliance: true,
        captchaBypass: false,
        paywallBypass: false,
        rateLimitPerDomain: "adaptive",
        circuitBreaker: true
      },
      decisions
    };
  });
}
