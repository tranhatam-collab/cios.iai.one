import type { WorkerEnv } from "./persistence";

type StoredEvent = {
  id: string;
  source: string;
  eventType: string;
  occurredAt: string;
  payload: unknown;
  traceId: string;
  createdAt: string;
};

type FlowLog = {
  flowRunId: string;
  triggerName: string;
  status: string;
  completedAt: string;
  traceId: string;
  payload?: unknown;
};

const eventMemory: StoredEvent[] = [];
const flowMemory: FlowLog[] = [];

export async function storeIngestEvent(
  event: {
    source: string;
    eventType: string;
    occurredAt: string;
    payload: unknown;
    traceId: string;
  },
  env: WorkerEnv
): Promise<StoredEvent> {
  const row: StoredEvent = {
    id: crypto.randomUUID(),
    source: event.source,
    eventType: event.eventType,
    occurredAt: event.occurredAt,
    payload: event.payload,
    traceId: event.traceId,
    createdAt: new Date().toISOString()
  };

  if (env.CIOS_DB) {
    try {
      await env.CIOS_DB.prepare(
        `
        INSERT INTO api_events
          (id, source, event_type, occurred_at, payload_json, trace_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
        .bind(
          row.id,
          row.source,
          row.eventType,
          row.occurredAt,
          JSON.stringify(row.payload),
          row.traceId,
          row.createdAt
        )
        .run();
      return row;
    } catch {
      // fallback
    }
  }

  if (env.CIOS_KV) {
    try {
      await env.CIOS_KV.put(`event:${row.id}`, JSON.stringify(row), { expirationTtl: 30 * 24 * 60 * 60 });
      return row;
    } catch {
      // fallback
    }
  }

  eventMemory.unshift(row);
  if (eventMemory.length > 1000) eventMemory.length = 1000;
  return row;
}

export async function storeFlowLog(
  log: {
    flowRunId: string;
    triggerName: string;
    status: string;
    completedAt: string;
    traceId: string;
    payload?: unknown;
  },
  env: WorkerEnv
): Promise<void> {
  const row: FlowLog = { ...log };
  if (env.CIOS_DB) {
    try {
      await env.CIOS_DB.prepare(
        `
        INSERT INTO api_flow_logs
          (flow_run_id, trigger_name, status, completed_at, trace_id, payload_json)
        VALUES (?, ?, ?, ?, ?, ?)
        `
      )
        .bind(
          row.flowRunId,
          row.triggerName,
          row.status,
          row.completedAt,
          row.traceId,
          row.payload ? JSON.stringify(row.payload) : null
        )
        .run();
      return;
    } catch {
      // fallback
    }
  }

  if (env.CIOS_KV) {
    try {
      const key = `flowlog:${Date.now()}:${crypto.randomUUID()}`;
      await env.CIOS_KV.put(key, JSON.stringify(row), { expirationTtl: 30 * 24 * 60 * 60 });
      return;
    } catch {
      // fallback
    }
  }

  flowMemory.unshift(row);
  if (flowMemory.length > 1000) flowMemory.length = 1000;
}

export async function listFlowLogs(
  opts: {
    page: number;
    pageSize: number;
    from: string | null;
    to: string | null;
  },
  env: WorkerEnv
): Promise<FlowLog[]> {
  if (env.CIOS_DB) {
    try {
      const offset = (opts.page - 1) * opts.pageSize;
      const from = opts.from ?? "1970-01-01T00:00:00.000Z";
      const to = opts.to ?? "9999-12-31T23:59:59.999Z";
      const result = await env.CIOS_DB.prepare(
        `
        SELECT flow_run_id, trigger_name, status, completed_at, trace_id, payload_json
        FROM api_flow_logs
        WHERE completed_at >= ? AND completed_at <= ?
        ORDER BY completed_at DESC
        LIMIT ? OFFSET ?
        `
      )
        .bind(from, to, opts.pageSize, offset)
        .all<{
          flow_run_id: string;
          trigger_name: string;
          status: string;
          completed_at: string;
          trace_id: string;
          payload_json: string | null;
        }>();
      return (result.results ?? []).map((r) => ({
        flowRunId: r.flow_run_id,
        triggerName: r.trigger_name,
        status: r.status,
        completedAt: r.completed_at,
        traceId: r.trace_id,
        payload: r.payload_json ? JSON.parse(r.payload_json) : undefined
      }));
    } catch {
      // fallback
    }
  }

  if (env.CIOS_KV) {
    try {
      const listed = await env.CIOS_KV.list({ prefix: "flowlog:", limit: Math.min(opts.pageSize * 5, 1000) });
      const loaded = await Promise.all(
        listed.keys.map(async (k) => {
          const raw = await env.CIOS_KV!.get(k.name);
          return raw ? (JSON.parse(raw) as FlowLog) : null;
        })
      );
      const rows = loaded.filter((x): x is FlowLog => Boolean(x));
      rows.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
      const start = (opts.page - 1) * opts.pageSize;
      return rows.slice(start, start + opts.pageSize);
    } catch {
      // fallback
    }
  }

  const start = (opts.page - 1) * opts.pageSize;
  return flowMemory.slice(start, start + opts.pageSize);
}
