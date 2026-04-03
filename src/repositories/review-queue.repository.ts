import { randomUUID } from "node:crypto";

import { dbPool } from "../bootstrap/db.js";

export type ReviewItem = {
  id: string;
  reviewType: string;
  createdFromAction: string;
  actorId: string | null;
  workspaceId: string;
  targetObjectType: string;
  targetObjectId: string;
  reasonCodes: string[];
  evidenceBundle: Record<string, unknown>;
  severity: "low" | "medium" | "high";
  requiredApprovals: number;
  escalationTarget: string | null;
  assignedReviewerId: string | null;
  resolutionStatus: "pending" | "approved" | "rejected";
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateReviewInput = {
  workspaceId: string;
  reviewType: string;
  createdFromAction: string;
  actorId?: string;
  targetObjectType: string;
  targetObjectId: string;
  reasonCodes: string[];
  evidenceBundle?: Record<string, unknown>;
  severity?: "low" | "medium" | "high";
  requiredApprovals?: number;
  escalationTarget?: string;
  assignedReviewerId?: string;
  dueAt?: string;
};

const memoryReviewItems: ReviewItem[] = [];

function mapRow(row: {
  id: string;
  review_type: string;
  created_from_action: string;
  actor_id: string | null;
  workspace_id: string;
  target_object_type: string;
  target_object_id: string;
  reason_codes: string[];
  evidence_bundle: Record<string, unknown>;
  severity: "low" | "medium" | "high";
  required_approvals: number;
  escalation_target: string | null;
  assigned_reviewer_id: string | null;
  resolution_status: "pending" | "approved" | "rejected";
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}): ReviewItem {
  return {
    id: row.id,
    reviewType: row.review_type,
    createdFromAction: row.created_from_action,
    actorId: row.actor_id,
    workspaceId: row.workspace_id,
    targetObjectType: row.target_object_type,
    targetObjectId: row.target_object_id,
    reasonCodes: row.reason_codes,
    evidenceBundle: row.evidence_bundle,
    severity: row.severity,
    requiredApprovals: row.required_approvals,
    escalationTarget: row.escalation_target,
    assignedReviewerId: row.assigned_reviewer_id,
    resolutionStatus: row.resolution_status,
    resolutionNote: row.resolution_note,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    dueAt: row.due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createReviewItem(
  input: CreateReviewInput,
): Promise<ReviewItem> {
  try {
    const result = await dbPool.query<{
      id: string;
      review_type: string;
      created_from_action: string;
      actor_id: string | null;
      workspace_id: string;
      target_object_type: string;
      target_object_id: string;
      reason_codes: string[];
      evidence_bundle: Record<string, unknown>;
      severity: "low" | "medium" | "high";
      required_approvals: number;
      escalation_target: string | null;
      assigned_reviewer_id: string | null;
      resolution_status: "pending" | "approved" | "rejected";
      resolution_note: string | null;
      resolved_by: string | null;
      resolved_at: string | null;
      due_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      INSERT INTO review_items (
        workspace_id,
        review_type,
        created_from_action,
        actor_id,
        target_object_type,
        target_object_id,
        reason_codes,
        evidence_bundle,
        severity,
        required_approvals,
        escalation_target,
        assigned_reviewer_id,
        due_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13)
      RETURNING
        id::text,
        review_type,
        created_from_action,
        actor_id::text,
        workspace_id::text,
        target_object_type,
        target_object_id,
        reason_codes,
        evidence_bundle,
        severity,
        required_approvals,
        escalation_target,
        assigned_reviewer_id::text,
        resolution_status,
        resolution_note,
        resolved_by::text,
        resolved_at::text,
        due_at::text,
        created_at::text,
        updated_at::text
      `,
      [
        input.workspaceId,
        input.reviewType,
        input.createdFromAction,
        input.actorId ?? null,
        input.targetObjectType,
        input.targetObjectId,
        input.reasonCodes,
        JSON.stringify(input.evidenceBundle ?? {}),
        input.severity ?? "medium",
        input.requiredApprovals ?? 1,
        input.escalationTarget ?? null,
        input.assignedReviewerId ?? null,
        input.dueAt ?? null,
      ],
    );
    return mapRow(result.rows[0]);
  } catch {
    const now = new Date().toISOString();
    const item: ReviewItem = {
      id: `mem_review_${randomUUID()}`,
      reviewType: input.reviewType,
      createdFromAction: input.createdFromAction,
      actorId: input.actorId ?? null,
      workspaceId: input.workspaceId,
      targetObjectType: input.targetObjectType,
      targetObjectId: input.targetObjectId,
      reasonCodes: input.reasonCodes,
      evidenceBundle: input.evidenceBundle ?? {},
      severity: input.severity ?? "medium",
      requiredApprovals: input.requiredApprovals ?? 1,
      escalationTarget: input.escalationTarget ?? null,
      assignedReviewerId: input.assignedReviewerId ?? null,
      resolutionStatus: "pending",
      resolutionNote: null,
      resolvedBy: null,
      resolvedAt: null,
      dueAt: input.dueAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    memoryReviewItems.unshift(item);
    return item;
  }
}

export async function listReviewItems(
  workspaceId: string,
  status?: "pending" | "approved" | "rejected",
): Promise<ReviewItem[]> {
  try {
    const result = await dbPool.query<{
      id: string;
      review_type: string;
      created_from_action: string;
      actor_id: string | null;
      workspace_id: string;
      target_object_type: string;
      target_object_id: string;
      reason_codes: string[];
      evidence_bundle: Record<string, unknown>;
      severity: "low" | "medium" | "high";
      required_approvals: number;
      escalation_target: string | null;
      assigned_reviewer_id: string | null;
      resolution_status: "pending" | "approved" | "rejected";
      resolution_note: string | null;
      resolved_by: string | null;
      resolved_at: string | null;
      due_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      SELECT
        id::text,
        review_type,
        created_from_action,
        actor_id::text,
        workspace_id::text,
        target_object_type,
        target_object_id,
        reason_codes,
        evidence_bundle,
        severity,
        required_approvals,
        escalation_target,
        assigned_reviewer_id::text,
        resolution_status,
        resolution_note,
        resolved_by::text,
        resolved_at::text,
        due_at::text,
        created_at::text,
        updated_at::text
      FROM review_items
      WHERE workspace_id = $1
        AND ($2::text IS NULL OR resolution_status = $2::text)
      ORDER BY created_at DESC
      LIMIT 200
      `,
      [workspaceId, status ?? null],
    );
    return result.rows.map(mapRow);
  } catch {
    return memoryReviewItems.filter(
      (item) =>
        item.workspaceId === workspaceId &&
        (!status || item.resolutionStatus === status),
    );
  }
}

export async function resolveReviewItem(params: {
  id: string;
  workspaceId: string;
  decision: "approved" | "rejected";
  resolvedBy: string;
  resolutionNote?: string;
}): Promise<ReviewItem | null> {
  try {
    const result = await dbPool.query<{
      id: string;
      review_type: string;
      created_from_action: string;
      actor_id: string | null;
      workspace_id: string;
      target_object_type: string;
      target_object_id: string;
      reason_codes: string[];
      evidence_bundle: Record<string, unknown>;
      severity: "low" | "medium" | "high";
      required_approvals: number;
      escalation_target: string | null;
      assigned_reviewer_id: string | null;
      resolution_status: "pending" | "approved" | "rejected";
      resolution_note: string | null;
      resolved_by: string | null;
      resolved_at: string | null;
      due_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      UPDATE review_items
      SET
        resolution_status = $3,
        resolution_note = $4,
        resolved_by = $5,
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
        AND workspace_id = $2
        AND resolution_status = 'pending'
      RETURNING
        id::text,
        review_type,
        created_from_action,
        actor_id::text,
        workspace_id::text,
        target_object_type,
        target_object_id,
        reason_codes,
        evidence_bundle,
        severity,
        required_approvals,
        escalation_target,
        assigned_reviewer_id::text,
        resolution_status,
        resolution_note,
        resolved_by::text,
        resolved_at::text,
        due_at::text,
        created_at::text,
        updated_at::text
      `,
      [
        params.id,
        params.workspaceId,
        params.decision,
        params.resolutionNote ?? null,
        params.resolvedBy,
      ],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  } catch {
    const found = memoryReviewItems.find(
      (item) =>
        item.id === params.id &&
        item.workspaceId === params.workspaceId &&
        item.resolutionStatus === "pending",
    );
    if (!found) {
      return null;
    }
    found.resolutionStatus = params.decision;
    found.resolutionNote = params.resolutionNote ?? null;
    found.resolvedBy = params.resolvedBy;
    found.resolvedAt = new Date().toISOString();
    found.updatedAt = new Date().toISOString();
    return found;
  }
}
