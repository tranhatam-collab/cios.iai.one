import type { FastifyInstance } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { env } from "../../../../bootstrap/env.js";
import { ERROR_CODES } from "../../../../app/error-codes.js";
import { ACTIONS, requireAction } from "../../../../app/permissions.js";
import { publishStreamEvent } from "../../../../app/realtime-stream.js";
import { writeComplianceAuditLog } from "../../../../repositories/compliance.repository.js";
import {
  createFlowRun,
  updateFlowRunStatus,
} from "../../../../repositories/flow-run.repository.js";
import { envelopeError, envelopeOk } from "../../response-envelope.js";

const FlowDispatchInput = z.object({
  triggerName: z.string().min(2),
  sourceDecisionId: z.string().min(2),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  payload: z.record(z.string(), z.unknown()).default({}),
  approvedBy: z.string().optional(),
});

const FlowCallbackInput = z.object({
  flowRunId: z.string().min(2),
  status: z.enum(["running", "success", "failed", "cancelled"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

function computeFlowCallbackSignature(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

function hasValidFlowCallbackSignature(
  signature: string,
  expectedHex: string,
): boolean {
  try {
    const provided = Buffer.from(signature, "hex");
    const expected = Buffer.from(expectedHex, "hex");
    if (
      provided.length === 0 ||
      expected.length === 0 ||
      provided.length !== expected.length
    ) {
      return false;
    }
    return timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

export async function registerV1FlowRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post("/flow/dispatch", async (request, reply) => {
    const user = await requireAction(request, reply, ACTIONS.flowDispatchWrite);
    if (!user) return;

    const parsed = FlowDispatchInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        envelopeError(request, {
          code: ERROR_CODES.validationFailed,
          message: "Invalid flow dispatch payload.",
          details: parsed.error.flatten(),
        }),
      );
    }

    const run = await createFlowRun({
      workspaceId: user.workspaceId,
      triggerName: parsed.data.triggerName,
      sourceDecisionId: parsed.data.sourceDecisionId,
      priority: parsed.data.priority,
      payload: parsed.data.payload,
      requestedBy: user.userId,
      approvedBy: parsed.data.approvedBy,
      traceId: request.id,
    });

    await writeComplianceAuditLog({
      workspaceId: user.workspaceId,
      eventType: "flow_dispatch_created",
      message: "Flow dispatch accepted.",
      actor: user.email,
      traceId: request.id,
      action: "flow.dispatch",
      targetType: "flow_run",
      targetId: run.id,
      payload: {
        trigger_name: run.triggerName,
        priority: run.priority,
        status: run.status,
      },
    });

    publishStreamEvent({
      event_type: "flow.updated",
      workspace_id: user.workspaceId,
      scope_type: "workspace",
      scope_id: user.workspaceId,
      object_type: "flow_run",
      object_id: run.id,
      summary: "Flow dispatch accepted",
      severity:
        run.priority === "critical" || run.priority === "high"
          ? "high"
          : "medium",
      trace_id: request.id,
      payload_minimal: {
        trigger_name: run.triggerName,
        status: run.status,
        priority: run.priority,
      },
    });

    return envelopeOk(request, { run });
  });

  app.post("/flow/callback", async (request, reply) => {
    let workspaceId = "";
    let actorEmail = "flow-system";

    if (env.FLOW_WEBHOOK_SECRET) {
      const signature = request.headers["x-flow-signature"];
      if (typeof signature !== "string") {
        return reply.status(401).send(
          envelopeError(request, {
            code: ERROR_CODES.authUnauthorized,
            message: "Missing x-flow-signature header.",
          }),
        );
      }

      const rawBody = JSON.stringify(request.body ?? {});
      const expected = computeFlowCallbackSignature(
        rawBody,
        env.FLOW_WEBHOOK_SECRET,
      );
      if (!hasValidFlowCallbackSignature(signature, expected)) {
        return reply.status(401).send(
          envelopeError(request, {
            code: ERROR_CODES.authUnauthorized,
            message: "Invalid flow callback signature.",
          }),
        );
      }

      const workspaceHeader = request.headers["x-workspace-id"];
      if (
        typeof workspaceHeader !== "string" ||
        workspaceHeader.trim() === ""
      ) {
        return reply.status(400).send(
          envelopeError(request, {
            code: ERROR_CODES.validationFailed,
            message: "Missing x-workspace-id header for signed callback.",
          }),
        );
      }
      workspaceId = workspaceHeader;
    } else {
      const user = await requireAction(
        request,
        reply,
        ACTIONS.flowCallbackWrite,
      );
      if (!user) return;
      workspaceId = user.workspaceId;
      actorEmail = user.email;
    }

    const parsed = FlowCallbackInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        envelopeError(request, {
          code: ERROR_CODES.validationFailed,
          message: "Invalid flow callback payload.",
          details: parsed.error.flatten(),
        }),
      );
    }

    const updated = await updateFlowRunStatus({
      id: parsed.data.flowRunId,
      workspaceId,
      status: parsed.data.status,
      callbackPayload: parsed.data.payload,
      traceId: request.id,
    });

    if (!updated) {
      return reply.status(404).send(
        envelopeError(request, {
          code: ERROR_CODES.resourceNotFound,
          message: "Flow run not found.",
          details: { resource: "flow_run", id: parsed.data.flowRunId },
        }),
      );
    }

    await writeComplianceAuditLog({
      workspaceId,
      eventType: "flow_dispatch_updated",
      message: `Flow status updated: ${updated.status}`,
      actor: actorEmail,
      traceId: request.id,
      action: "flow.callback",
      targetType: "flow_run",
      targetId: updated.id,
      payload: {
        status: updated.status,
        callback_payload: updated.callbackPayload,
      },
    });

    publishStreamEvent({
      event_type: "flow.updated",
      workspace_id: workspaceId,
      scope_type: "workspace",
      scope_id: workspaceId,
      object_type: "flow_run",
      object_id: updated.id,
      summary: "Flow run status updated",
      severity:
        updated.status === "failed" || updated.status === "cancelled"
          ? "high"
          : "medium",
      trace_id: request.id,
      payload_minimal: {
        status: updated.status,
        trigger_name: updated.triggerName,
      },
    });

    return envelopeOk(request, { run: updated });
  });
}
