import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { evaluateComplianceAction } from "../../../../app/cee-lite.js";
import { publishStreamEvent } from "../../../../app/realtime-stream.js";
import { ERROR_CODES } from "../../../../app/error-codes.js";
import { ACTIONS, requireAction } from "../../../../app/permissions.js";
import { writeComplianceAuditLog } from "../../../../repositories/compliance.repository.js";
import { createReviewItem } from "../../../../repositories/review-queue.repository.js";
import { envelopeError, envelopeOk } from "../../response-envelope.js";

const CeeEvaluateInput = z.object({
  actionType: z.string().min(2),
  actionClass: z.enum(["auto_safe", "auto_with_guardrails", "manual_required"]),
  targetObjectType: z.string().min(2),
  targetObjectId: z.string().min(2),
  targetRecordConfidence: z.number().min(0).max(100),
  targetTraceabilityStatus: z.enum([
    "source_backed",
    "inferred",
    "conflicting",
    "stale",
    "unsupported",
  ]),
  targetComplianceStatus: z.enum(["ok", "limited", "blocked"]),
  targetSourceGovernanceState: z.enum([
    "allowed",
    "allowed_with_limits",
    "metadata_only",
    "review_required",
    "blocked",
  ]),
  reviewStatus: z
    .enum(["none", "pending", "approved", "rejected"])
    .default("none"),
  suppressionStatus: z.enum(["active", "inactive"]).optional(),
  deletionPending: z.boolean().optional(),
  exportSensitivity: z.enum(["low", "medium", "high"]).optional(),
});

export async function registerV1CeeRoutes(app: FastifyInstance): Promise<void> {
  app.post("/compliance/cee/evaluate", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.complianceActionEvaluate,
    );
    if (!user) return;

    const parsed = CeeEvaluateInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        envelopeError(request, {
          code: ERROR_CODES.validationFailed,
          message: "Invalid CEE evaluate payload.",
          details: parsed.error.flatten(),
        }),
      );
    }

    const decision = evaluateComplianceAction({
      actorId: user.userId,
      actorRole: user.role,
      workspaceId: user.workspaceId,
      actionType: parsed.data.actionType,
      actionClass: parsed.data.actionClass,
      targetObjectType: parsed.data.targetObjectType,
      targetObjectId: parsed.data.targetObjectId,
      targetRecordConfidence: parsed.data.targetRecordConfidence,
      targetTraceabilityStatus: parsed.data.targetTraceabilityStatus,
      targetComplianceStatus: parsed.data.targetComplianceStatus,
      targetSourceGovernanceState: parsed.data.targetSourceGovernanceState,
      reviewStatus: parsed.data.reviewStatus,
      suppressionStatus: parsed.data.suppressionStatus,
      deletionPending: parsed.data.deletionPending,
      exportSensitivity: parsed.data.exportSensitivity,
      traceId: request.id,
    });

    const statusCode =
      decision.decision === "deny"
        ? 403
        : decision.decision === "review_required"
          ? 202
          : 200;
    if (decision.decision === "deny") {
      await writeComplianceAuditLog({
        workspaceId: user.workspaceId,
        eventType: "cee_decision_deny",
        message: "CEE denied sensitive action.",
        actor: user.email,
        traceId: request.id,
        action: parsed.data.actionType,
        targetType: parsed.data.targetObjectType,
        targetId: parsed.data.targetObjectId,
        payload: { decision },
      });

      publishStreamEvent({
        event_type: "compliance.updated",
        workspace_id: user.workspaceId,
        scope_type: "workspace",
        scope_id: user.workspaceId,
        object_type: parsed.data.targetObjectType,
        object_id: parsed.data.targetObjectId,
        summary: "Compliance decision deny",
        severity: "high",
        trace_id: request.id,
        payload_minimal: {
          decision: decision.decision,
          action_type: parsed.data.actionType,
          reasons: decision.reasons,
        },
      });

      return reply.status(statusCode).send(
        envelopeError(request, {
          code: ERROR_CODES.complianceDenied,
          message: "Action denied by compliance checks.",
          details: decision,
        }),
      );
    }

    if (decision.decision === "review_required") {
      const reviewItem = await createReviewItem({
        workspaceId: user.workspaceId,
        reviewType: "compliance_action_review",
        createdFromAction: parsed.data.actionType,
        actorId: user.userId,
        targetObjectType: parsed.data.targetObjectType,
        targetObjectId: parsed.data.targetObjectId,
        reasonCodes: decision.reasons,
        evidenceBundle: {
          policy_refs: decision.policyRefs,
          obligations: decision.obligations,
          decision,
        },
        severity: parsed.data.exportSensitivity === "high" ? "high" : "medium",
        requiredApprovals: decision.requiredApprovals,
        escalationTarget:
          decision.requiredApprovals > 1 ? "compliance_admin" : undefined,
      });

      await writeComplianceAuditLog({
        workspaceId: user.workspaceId,
        eventType: "review_item_created",
        message: "Review item created from CEE review_required decision.",
        actor: user.email,
        traceId: request.id,
        action: parsed.data.actionType,
        targetType: parsed.data.targetObjectType,
        targetId: parsed.data.targetObjectId,
        payload: {
          decision,
          review_item_id: reviewItem.id,
        },
      });

      publishStreamEvent({
        event_type: "compliance.updated",
        workspace_id: user.workspaceId,
        scope_type: "workspace",
        scope_id: user.workspaceId,
        object_type: parsed.data.targetObjectType,
        object_id: parsed.data.targetObjectId,
        summary: "Compliance decision review required",
        severity: parsed.data.exportSensitivity === "high" ? "high" : "medium",
        trace_id: request.id,
        payload_minimal: {
          decision: decision.decision,
          action_type: parsed.data.actionType,
          review_item_id: reviewItem.id,
        },
      });

      publishStreamEvent({
        event_type: "review.created",
        workspace_id: user.workspaceId,
        scope_type: "workspace",
        scope_id: user.workspaceId,
        object_type: "review_item",
        object_id: reviewItem.id,
        summary: "Review item created from compliance gate",
        severity: reviewItem.severity,
        trace_id: request.id,
        payload_minimal: {
          review_type: reviewItem.reviewType,
          resolution_status: reviewItem.resolutionStatus,
          required_approvals: reviewItem.requiredApprovals,
          escalation_target: reviewItem.escalationTarget,
        },
      });

      return reply.status(statusCode).send(
        envelopeError(request, {
          code: ERROR_CODES.complianceReviewRequired,
          message: "Action requires manual review.",
          details: {
            decision,
            review_item_id: reviewItem.id,
          },
        }),
      );
    }

    await writeComplianceAuditLog({
      workspaceId: user.workspaceId,
      eventType: "cee_decision_allow",
      message: "CEE allowed action.",
      actor: user.email,
      traceId: request.id,
      action: parsed.data.actionType,
      targetType: parsed.data.targetObjectType,
      targetId: parsed.data.targetObjectId,
      payload: { decision },
    });

    publishStreamEvent({
      event_type: "compliance.updated",
      workspace_id: user.workspaceId,
      scope_type: "workspace",
      scope_id: user.workspaceId,
      object_type: parsed.data.targetObjectType,
      object_id: parsed.data.targetObjectId,
      summary: "Compliance decision allow",
      severity: "low",
      trace_id: request.id,
      payload_minimal: {
        decision: decision.decision,
        action_type: parsed.data.actionType,
      },
    });

    return envelopeOk(request, { decision });
  });
}
