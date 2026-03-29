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

type SystemMetrics = {
  throughputPerMin: number;
  activeIncidents: number;
  anomalyCount: number;
  queueDepth: number;
};

type HourlyReport = {
  reportId: string;
  generatedAt: string;
  bucketStart: string;
  eventCount: number;
  riskSummary: "low" | "medium" | "high";
  anomalyCount: number;
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

function parseIsoOrFallback(value: string | null, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

function riskSummaryFromCounts(riskEvents: number, totalEvents: number): "low" | "medium" | "high" {
  if (totalEvents <= 0) return "low";
  const ratio = riskEvents / totalEvents;
  if (ratio >= 0.35 || riskEvents >= 20) return "high";
  if (ratio >= 0.15 || riskEvents >= 8) return "medium";
  return "low";
}

export async function getSystemMetrics(
  opts: { from: string | null; to: string | null },
  env: WorkerEnv
): Promise<SystemMetrics> {
  const from = parseIsoOrFallback(opts.from, new Date(Date.now() - 60 * 60 * 1000).toISOString());
  const to = parseIsoOrFallback(opts.to, new Date().toISOString());
  const minutes = Math.max(1, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60000));

  if (env.CIOS_DB) {
    try {
      const eventsRow = await env.CIOS_DB.prepare(
        "SELECT COUNT(*) AS count FROM api_events WHERE occurred_at >= ? AND occurred_at <= ?"
      )
        .bind(from, to)
        .first<{ count: number | string }>();
      const anomalyRow = await env.CIOS_DB.prepare(
        "SELECT COUNT(*) AS count FROM api_events WHERE occurred_at >= ? AND occurred_at <= ? AND LOWER(event_type) LIKE '%anomaly%'"
      )
        .bind(from, to)
        .first<{ count: number | string }>();
      const incidentRow = await env.CIOS_DB.prepare(
        "SELECT COUNT(*) AS count FROM api_audit_logs WHERE at >= ? AND at <= ? AND result = 'failed'"
      )
        .bind(from, to)
        .first<{ count: number | string }>();
      const queueRow = await env.CIOS_DB.prepare(
        "SELECT COUNT(*) AS count FROM api_flow_logs WHERE completed_at >= ? AND completed_at <= ? AND status IN ('queued', 'running')"
      )
        .bind(from, to)
        .first<{ count: number | string }>();

      const eventCount = Number(eventsRow?.count ?? 0);
      return {
        throughputPerMin: Number((eventCount / minutes).toFixed(2)),
        activeIncidents: Number(incidentRow?.count ?? 0),
        anomalyCount: Number(anomalyRow?.count ?? 0),
        queueDepth: Number(queueRow?.count ?? 0)
      };
    } catch {
      // fallback
    }
  }

  const eventSubset = eventMemory.filter((e) => e.occurredAt >= from && e.occurredAt <= to);
  const anomalyCount = eventSubset.filter((e) => e.eventType.toLowerCase().includes("anomaly")).length;
  const activeIncidents = 0;
  const queueDepth = flowMemory.filter(
    (f) => f.completedAt >= from && f.completedAt <= to && (f.status === "queued" || f.status === "running")
  ).length;
  return {
    throughputPerMin: Number((eventSubset.length / minutes).toFixed(2)),
    activeIncidents,
    anomalyCount,
    queueDepth
  };
}

export async function listHourlyReports(
  opts: {
    page: number;
    pageSize: number;
    from: string | null;
    to: string | null;
    sortOrder: "asc" | "desc";
  },
  env: WorkerEnv
): Promise<HourlyReport[]> {
  const from = parseIsoOrFallback(opts.from, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const to = parseIsoOrFallback(opts.to, new Date().toISOString());
  const offset = (opts.page - 1) * opts.pageSize;
  const order = opts.sortOrder === "asc" ? "ASC" : "DESC";

  if (env.CIOS_DB) {
    try {
      const query = `
        SELECT
          strftime('%Y-%m-%dT%H:00:00.000Z', occurred_at) AS bucket_start,
          COUNT(*) AS event_count,
          SUM(CASE WHEN LOWER(event_type) LIKE '%risk%' THEN 1 ELSE 0 END) AS risk_event_count,
          SUM(CASE WHEN LOWER(event_type) LIKE '%anomaly%' THEN 1 ELSE 0 END) AS anomaly_count
        FROM api_events
        WHERE occurred_at >= ? AND occurred_at <= ?
        GROUP BY bucket_start
        ORDER BY bucket_start ${order}
        LIMIT ? OFFSET ?
      `;
      const result = await env.CIOS_DB.prepare(query).bind(from, to, opts.pageSize, offset).all<{
        bucket_start: string;
        event_count: number | string;
        risk_event_count: number | string;
        anomaly_count: number | string;
      }>();

      return (result.results ?? []).map((row, idx) => {
        const eventCount = Number(row.event_count ?? 0);
        const riskEvents = Number(row.risk_event_count ?? 0);
        const anomalyCount = Number(row.anomaly_count ?? 0);
        return {
          reportId: `hourly_${opts.page}_${idx + 1}`,
          generatedAt: new Date().toISOString(),
          bucketStart: row.bucket_start,
          eventCount,
          riskSummary: riskSummaryFromCounts(riskEvents, eventCount),
          anomalyCount
        };
      });
    } catch {
      // fallback
    }
  }

  const buckets = new Map<string, { eventCount: number; riskEvents: number; anomalyCount: number }>();
  for (const event of eventMemory) {
    if (event.occurredAt < from || event.occurredAt > to) continue;
    const date = new Date(event.occurredAt);
    date.setUTCMinutes(0, 0, 0);
    const key = date.toISOString();
    const current = buckets.get(key) ?? { eventCount: 0, riskEvents: 0, anomalyCount: 0 };
    current.eventCount += 1;
    if (event.eventType.toLowerCase().includes("risk")) current.riskEvents += 1;
    if (event.eventType.toLowerCase().includes("anomaly")) current.anomalyCount += 1;
    buckets.set(key, current);
  }

  const rows = Array.from(buckets.entries()).map(([bucketStart, agg]) => ({
    reportId: `hourly_mem_${bucketStart}`,
    generatedAt: new Date().toISOString(),
    bucketStart,
    eventCount: agg.eventCount,
    riskSummary: riskSummaryFromCounts(agg.riskEvents, agg.eventCount),
    anomalyCount: agg.anomalyCount
  }));
  rows.sort((a, b) => (opts.sortOrder === "asc" ? (a.bucketStart < b.bucketStart ? -1 : 1) : a.bucketStart > b.bucketStart ? -1 : 1));
  return rows.slice(offset, offset + opts.pageSize);
}
