import { randomUUID } from "node:crypto";

import { dbPool } from "../bootstrap/db.js";

export type FlowRun = {
  id: string;
  workspaceId: string;
  triggerName: string;
  sourceDecisionId: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "accepted" | "running" | "success" | "failed" | "cancelled";
  payload: Record<string, unknown>;
  callbackPayload: Record<string, unknown>;
  requestedBy: string | null;
  approvedBy: string | null;
  traceId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const memoryFlowRuns: FlowRun[] = [];

function mapRow(row: {
  id: string;
  workspace_id: string;
  trigger_name: string;
  source_decision_id: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "accepted" | "running" | "success" | "failed" | "cancelled";
  payload_json: Record<string, unknown>;
  callback_payload_json: Record<string, unknown>;
  requested_by: string | null;
  approved_by: string | null;
  trace_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}): FlowRun {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    triggerName: row.trigger_name,
    sourceDecisionId: row.source_decision_id,
    priority: row.priority,
    status: row.status,
    payload: row.payload_json,
    callbackPayload: row.callback_payload_json,
    requestedBy: row.requested_by,
    approvedBy: row.approved_by,
    traceId: row.trace_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createFlowRun(input: {
  workspaceId: string;
  triggerName: string;
  sourceDecisionId: string;
  priority: "low" | "medium" | "high" | "critical";
  payload: Record<string, unknown>;
  requestedBy: string;
  approvedBy?: string;
  traceId?: string;
}): Promise<FlowRun> {
  try {
    const result = await dbPool.query<{
      id: string;
      workspace_id: string;
      trigger_name: string;
      source_decision_id: string;
      priority: "low" | "medium" | "high" | "critical";
      status: "accepted" | "running" | "success" | "failed" | "cancelled";
      payload_json: Record<string, unknown>;
      callback_payload_json: Record<string, unknown>;
      requested_by: string | null;
      approved_by: string | null;
      trace_id: string | null;
      completed_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      INSERT INTO flow_runs (
        workspace_id,
        trigger_name,
        source_decision_id,
        priority,
        status,
        payload_json,
        requested_by,
        approved_by,
        trace_id
      ) VALUES ($1,$2,$3,$4,'accepted',$5::jsonb,$6,$7,$8)
      RETURNING
        id::text,
        workspace_id::text,
        trigger_name,
        source_decision_id,
        priority,
        status,
        payload_json,
        callback_payload_json,
        requested_by::text,
        approved_by::text,
        trace_id,
        completed_at::text,
        created_at::text,
        updated_at::text
      `,
      [
        input.workspaceId,
        input.triggerName,
        input.sourceDecisionId,
        input.priority,
        JSON.stringify(input.payload),
        input.requestedBy,
        input.approvedBy ?? null,
        input.traceId ?? null,
      ],
    );
    return mapRow(result.rows[0]);
  } catch {
    const now = new Date().toISOString();
    const row: FlowRun = {
      id: `mem_flow_${randomUUID()}`,
      workspaceId: input.workspaceId,
      triggerName: input.triggerName,
      sourceDecisionId: input.sourceDecisionId,
      priority: input.priority,
      status: "accepted",
      payload: input.payload,
      callbackPayload: {},
      requestedBy: input.requestedBy,
      approvedBy: input.approvedBy ?? null,
      traceId: input.traceId ?? null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    memoryFlowRuns.unshift(row);
    return row;
  }
}

export async function updateFlowRunStatus(input: {
  id: string;
  workspaceId: string;
  status: "running" | "success" | "failed" | "cancelled";
  callbackPayload?: Record<string, unknown>;
  traceId?: string;
}): Promise<FlowRun | null> {
  try {
    const result = await dbPool.query<{
      id: string;
      workspace_id: string;
      trigger_name: string;
      source_decision_id: string;
      priority: "low" | "medium" | "high" | "critical";
      status: "accepted" | "running" | "success" | "failed" | "cancelled";
      payload_json: Record<string, unknown>;
      callback_payload_json: Record<string, unknown>;
      requested_by: string | null;
      approved_by: string | null;
      trace_id: string | null;
      completed_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      UPDATE flow_runs
      SET
        status = $3,
        callback_payload_json = $4::jsonb,
        trace_id = COALESCE($5, trace_id),
        completed_at = CASE WHEN $3 IN ('success','failed','cancelled') THEN NOW() ELSE completed_at END,
        updated_at = NOW()
      WHERE id = $1
        AND workspace_id = $2
      RETURNING
        id::text,
        workspace_id::text,
        trigger_name,
        source_decision_id,
        priority,
        status,
        payload_json,
        callback_payload_json,
        requested_by::text,
        approved_by::text,
        trace_id,
        completed_at::text,
        created_at::text,
        updated_at::text
      `,
      [
        input.id,
        input.workspaceId,
        input.status,
        JSON.stringify(input.callbackPayload ?? {}),
        input.traceId ?? null,
      ],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  } catch {
    const found = memoryFlowRuns.find(
      (item) => item.id === input.id && item.workspaceId === input.workspaceId,
    );
    if (!found) {
      return null;
    }
    found.status = input.status;
    found.callbackPayload = input.callbackPayload ?? {};
    found.traceId = input.traceId ?? found.traceId;
    if (
      input.status === "success" ||
      input.status === "failed" ||
      input.status === "cancelled"
    ) {
      found.completedAt = new Date().toISOString();
    }
    found.updatedAt = new Date().toISOString();
    return found;
  }
}
