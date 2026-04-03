import type { FastifyInstance } from "fastify";

import { ACTIONS, requireAction } from "../../../../app/permissions.js";
import {
  getDiscoverySources,
  getGovernanceDecisions,
} from "../../../../repositories/discovery.repository.js";
import { envelopeOk } from "../../response-envelope.js";

export async function registerV1DiscoveryRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/discovery/sources", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.discoverySourcesRead,
    );
    if (!user) return;
    const workspaceCode = user.workspaceCode ?? "demo";
    const queue = await getDiscoverySources(workspaceCode);
    return envelopeOk(request, { queue });
  });

  app.get("/discovery/crawl-governance", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.discoveryGovernanceRead,
    );
    if (!user) return;
    const workspaceCode = user.workspaceCode ?? "demo";
    const decisions = await getGovernanceDecisions(workspaceCode);
    return envelopeOk(request, {
      policy: {
        robotsCompliance: true,
        captchaBypass: false,
        paywallBypass: false,
        rateLimitPerDomain: "adaptive",
        circuitBreaker: true,
      },
      decisions,
    });
  });
}
