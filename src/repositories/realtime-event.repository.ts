import { randomUUID } from "node:crypto";

import { dbPool } from "../bootstrap/db.js";

type Severity = "low" | "medium" | "high";

export type StoredRealtimeEvent = {
  eventId: string;
  workspaceId: string;
  eventType: string;
  scopeType: string;
  scopeId: string;
  objectType: string;
  objectId: string;
  summary: string;
  severity: Severity;
  timestamp: string;
  traceId: string;
  payloadMinimal: Record<string, unknown>;
};

const memoryEvents: StoredRealtimeEvent[] = [];

function mapRow(row: {
  event_id: string;
  workspace_id: string;
  event_type: string;
  scope_type: string;
  scope_id: string;
  object_type: string;
  object_id: string;
  summary: string;
  severity: Severity;
  timestamp: string;
  trace_id: string;
  payload_minimal: Record<string, unknown>;
}): StoredRealtimeEvent {
  return {
    eventId: row.event_id,
    workspaceId: row.workspace_id,
    eventType: row.event_type,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    objectType: row.object_type,
    objectId: row.object_id,
    summary: row.summary,
    severity: row.severity,
    timestamp: row.timestamp,
    traceId: row.trace_id,
    payloadMinimal: row.payload_minimal,
  };
}

export async function persistRealtimeEvent(input: {
  eventId?: string;
  workspaceId: string;
  eventType: string;
  scopeType: string;
  scopeId: string;
  objectType: string;
  objectId: string;
  summary: string;
  severity: Severity;
  timestamp: string;
  traceId: string;
  payloadMinimal: Record<string, unknown>;
}): Promise<StoredRealtimeEvent> {
  const eventId = input.eventId ?? randomUUID();
  try {
    const result = await dbPool.query<{
      event_id: string;
      workspace_id: string;
      event_type: string;
      scope_type: string;
      scope_id: string;
      object_type: string;
      object_id: string;
      summary: string;
      severity: Severity;
      timestamp: string;
      trace_id: string;
      payload_minimal: Record<string, unknown>;
    }>(
      `
      INSERT INTO realtime_events (
        event_id,
        workspace_id,
        event_type,
        scope_type,
        scope_id,
        object_type,
        object_id,
        summary,
        severity,
        timestamp,
        trace_id,
        payload_minimal
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamptz,$11,$12::jsonb)
      RETURNING
        event_id,
        workspace_id::text,
        event_type,
        scope_type,
        scope_id,
        object_type,
        object_id,
        summary,
        severity,
        timestamp::text,
        trace_id,
        payload_minimal
      `,
      [
        eventId,
        input.workspaceId,
        input.eventType,
        input.scopeType,
        input.scopeId,
        input.objectType,
        input.objectId,
        input.summary,
        input.severity,
        input.timestamp,
        input.traceId,
        JSON.stringify(input.payloadMinimal),
      ],
    );
    return mapRow(result.rows[0]);
  } catch {
    const event: StoredRealtimeEvent = {
      eventId,
      workspaceId: input.workspaceId,
      eventType: input.eventType,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      objectType: input.objectType,
      objectId: input.objectId,
      summary: input.summary,
      severity: input.severity,
      timestamp: input.timestamp,
      traceId: input.traceId,
      payloadMinimal: input.payloadMinimal,
    };
    memoryEvents.push(event);
    if (memoryEvents.length > 1000) {
      memoryEvents.splice(0, memoryEvents.length - 1000);
    }
    return event;
  }
}

export async function listRealtimeEventsSince(params: {
  workspaceId: string;
  afterEventId?: string;
  limit?: number;
}): Promise<StoredRealtimeEvent[]> {
  const limit = Math.max(1, Math.min(params.limit ?? 200, 500));
  try {
    if (!params.afterEventId) {
      const result = await dbPool.query<{
        event_id: string;
        workspace_id: string;
        event_type: string;
        scope_type: string;
        scope_id: string;
        object_type: string;
        object_id: string;
        summary: string;
        severity: Severity;
        timestamp: string;
        trace_id: string;
        payload_minimal: Record<string, unknown>;
      }>(
        `
        SELECT
          event_id,
          workspace_id::text,
          event_type,
          scope_type,
          scope_id,
          object_type,
          object_id,
          summary,
          severity,
          timestamp::text,
          trace_id,
          payload_minimal
        FROM realtime_events
        WHERE workspace_id = $1
        ORDER BY id DESC
        LIMIT $2
        `,
        [params.workspaceId, limit],
      );
      return result.rows.map(mapRow).reverse();
    }

    const result = await dbPool.query<{
      event_id: string;
      workspace_id: string;
      event_type: string;
      scope_type: string;
      scope_id: string;
      object_type: string;
      object_id: string;
      summary: string;
      severity: Severity;
      timestamp: string;
      trace_id: string;
      payload_minimal: Record<string, unknown>;
    }>(
      `
      WITH anchor AS (
        SELECT id
        FROM realtime_events
        WHERE workspace_id = $1 AND event_id = $2
        LIMIT 1
      )
      SELECT
        re.event_id,
        re.workspace_id::text,
        re.event_type,
        re.scope_type,
        re.scope_id,
        re.object_type,
        re.object_id,
        re.summary,
        re.severity,
        re.timestamp::text,
        re.trace_id,
        re.payload_minimal
      FROM realtime_events re
      WHERE re.workspace_id = $1
        AND (
          NOT EXISTS (SELECT 1 FROM anchor)
          OR re.id > (SELECT id FROM anchor)
        )
      ORDER BY re.id ASC
      LIMIT $3
      `,
      [params.workspaceId, params.afterEventId, limit],
    );
    return result.rows.map(mapRow);
  } catch {
    const filtered = memoryEvents.filter(
      (event) => event.workspaceId === params.workspaceId,
    );
    if (!params.afterEventId) {
      return filtered.slice(-limit);
    }
    const idx = filtered.findIndex(
      (event) => event.eventId === params.afterEventId,
    );
    if (idx < 0) {
      return filtered.slice(-limit);
    }
    return filtered.slice(idx + 1, idx + 1 + limit);
  }
}

export async function listRealtimeEventsRecent(params: {
  workspaceId: string;
  limit?: number;
}): Promise<StoredRealtimeEvent[]> {
  const limit = Math.max(1, Math.min(params.limit ?? 200, 500));
  try {
    const result = await dbPool.query<{
      event_id: string;
      workspace_id: string;
      event_type: string;
      scope_type: string;
      scope_id: string;
      object_type: string;
      object_id: string;
      summary: string;
      severity: Severity;
      timestamp: string;
      trace_id: string;
      payload_minimal: Record<string, unknown>;
    }>(
      `
      SELECT
        event_id,
        workspace_id::text,
        event_type,
        scope_type,
        scope_id,
        object_type,
        object_id,
        summary,
        severity,
        timestamp::text,
        trace_id,
        payload_minimal
      FROM realtime_events
      WHERE workspace_id = $1
      ORDER BY id DESC
      LIMIT $2
      `,
      [params.workspaceId, limit],
    );
    return result.rows.map(mapRow).reverse();
  } catch {
    return memoryEvents
      .filter((event) => event.workspaceId === params.workspaceId)
      .slice(-limit);
  }
}
