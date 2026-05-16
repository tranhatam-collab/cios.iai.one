import type { FastifyInstance } from "fastify";

import { ACTIONS, requireAction } from "../../../../app/permissions.js";
import {
  getDiscoverySources,
  getGovernanceDecisions,
} from "../../../../repositories/discovery.repository.js";
import { publishStreamEvent } from "../../../../app/realtime-stream.js";
import { envelopeOk } from "../../response-envelope.js";

export async function registerV1DiscoveryRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post("/sources/discovery-queue", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.discoverySourcesWrite,
    );
    if (!user) return;

    publishStreamEvent({
      event_type: "compliance.updated",
      workspace_id: user.workspaceId,
      scope_type: "workspace",
      scope_id: user.workspaceId,
      object_type: "discovery_queue",
      object_id: "source_job_completed",
      summary: "Source discovery job completed",
      severity: "low",
      trace_id: request.id,
      payload_minimal: {
        category: "source.job.completed",
        workspace_code: user.workspaceCode,
      },
    });

    return envelopeOk(request, {
      accepted: true,
      status: "source_job_completed",
      trace_id: request.id,
    });
  });

  app.get("/sources/discovery-queue", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.discoverySourcesRead,
    );
    if (!user) return;
    const workspaceCode = user.workspaceCode ?? "demo";
    const queue = await getDiscoverySources(workspaceCode);
    return envelopeOk(request, {
      queue,
      summary: {
        total: queue.length,
        highRisk: queue.filter((item) => item.riskLevel === "high").length,
      },
    });
  });

  app.get("/sources/governance-decisions", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.discoveryGovernanceRead,
    );
    if (!user) return;
    const workspaceCode = user.workspaceCode ?? "demo";
    const decisions = await getGovernanceDecisions(workspaceCode);
    return envelopeOk(request, {
      decisions,
      summary: {
        total: decisions.length,
        reviewRequired: decisions.filter(
          (item) => item.sourceGovernanceState === "review_required",
        ).length,
      },
    });
  });

  app.get("/discovery/sources", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.discoverySourcesRead,
    );
    if (!user) return;
    const workspaceCode = user.workspaceCode ?? "demo";
    const queue = await getDiscoverySources(workspaceCode);
    return envelopeOk(request, {
      queue,
      summary: {
        total: queue.length,
        highRisk: queue.filter((item) => item.riskLevel === "high").length,
      },
    });
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
      summary: {
        total: decisions.length,
        reviewRequired: decisions.filter(
          (item) => item.sourceGovernanceState === "review_required",
        ).length,
      },
    });
  });
}
