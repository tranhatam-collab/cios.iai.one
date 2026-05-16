import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { ERROR_CODES } from "../../../../app/error-codes.js";
import { publishStreamEvent } from "../../../../app/realtime-stream.js";
import { ACTIONS, requireAction } from "../../../../app/permissions.js";
import { writeComplianceAuditLog } from "../../../../repositories/compliance.repository.js";
import {
  listReviewItems,
  resolveReviewItem,
} from "../../../../repositories/review-queue.repository.js";
import { envelopeError, envelopeOk } from "../../response-envelope.js";

const ResolveReviewInput = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(500).optional(),
});

export async function registerV1ReviewRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/reviews", async (request, reply) => {
    const user = await requireAction(request, reply, ACTIONS.reviewQueueRead);
    if (!user) return;

    const query = request.query as {
      status?: "pending" | "approved" | "rejected";
    };
    const items = await listReviewItems(user.workspaceId, query.status);
    return envelopeOk(request, {
      total: items.length,
      items,
    });
  });

  app.post("/reviews/:id/resolve", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.reviewQueueResolve,
    );
    if (!user) return;

    const parsed = ResolveReviewInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        envelopeError(request, {
          code: ERROR_CODES.validationFailed,
          message: "Invalid resolve review payload.",
          details: parsed.error.flatten(),
        }),
      );
    }

    const { id } = request.params as { id: string };
    const resolved = await resolveReviewItem({
      id,
      workspaceId: user.workspaceId,
      decision: parsed.data.decision,
      resolvedBy: user.userId,
      resolutionNote: parsed.data.note,
    });

    if (!resolved) {
      return reply.status(404).send(
        envelopeError(request, {
          code: ERROR_CODES.resourceNotFound,
          message: "Review item not found or already resolved.",
          details: { resource: "review_item", id },
        }),
      );
    }

    await writeComplianceAuditLog({
      workspaceId: user.workspaceId,
      eventType: "review_item_resolved",
      message: `Review item ${parsed.data.decision}.`,
      actor: user.email,
      traceId: request.id,
      action: "review.resolve",
      targetType: "review_item",
      targetId: resolved.id,
      payload: {
        decision: parsed.data.decision,
        note: parsed.data.note ?? null,
      },
    });

    publishStreamEvent({
      event_type: "review.updated",
      workspace_id: user.workspaceId,
      scope_type: "workspace",
      scope_id: user.workspaceId,
      object_type: "review_item",
      object_id: resolved.id,
      summary: "Review item updated",
      severity: resolved.severity,
      trace_id: request.id,
      payload_minimal: {
        resolution_status: resolved.resolutionStatus,
        resolved_by: resolved.resolvedBy,
        required_approvals: resolved.requiredApprovals,
        escalation_target: resolved.escalationTarget,
      },
    });

    return envelopeOk(request, { item: resolved });
  });
}
