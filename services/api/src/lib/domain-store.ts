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

type EventSearchRow = {
  id: string;
  source: string;
  eventType: string;
  occurredAt: string;
  traceId: string;
  payload: unknown;
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

export async function searchEvents(
  opts: {
    page: number;
    pageSize: number;
    from: string | null;
    to: string | null;
    text: string | null;
    source: string | null;
    eventType: string | null;
    sortOrder: "asc" | "desc";
  },
  env: WorkerEnv
): Promise<EventSearchRow[]> {
  const from = parseIsoOrFallback(opts.from, "1970-01-01T00:00:00.000Z");
  const to = parseIsoOrFallback(opts.to, "9999-12-31T23:59:59.999Z");
  const offset = (opts.page - 1) * opts.pageSize;
  const order = opts.sortOrder === "asc" ? "ASC" : "DESC";
  const textLike = `%${opts.text ?? ""}%`;
  const sourceLike = `%${opts.source ?? ""}%`;
  const eventTypeLike = `%${opts.eventType ?? ""}%`;

  if (env.CIOS_DB) {
    try {
      const result = await env.CIOS_DB.prepare(
        `
        SELECT id, source, event_type, occurred_at, trace_id, payload_json
        FROM api_events
        WHERE occurred_at >= ? AND occurred_at <= ?
          AND source LIKE ?
          AND event_type LIKE ?
          AND (
            id LIKE ?
            OR source LIKE ?
            OR event_type LIKE ?
            OR payload_json LIKE ?
          )
        ORDER BY occurred_at ${order}
        LIMIT ? OFFSET ?
        `
      )
        .bind(
          from,
          to,
          sourceLike,
          eventTypeLike,
          textLike,
          textLike,
          textLike,
          textLike,
          opts.pageSize,
          offset
        )
        .all<{
          id: string;
          source: string;
          event_type: string;
          occurred_at: string;
          trace_id: string;
          payload_json: string;
        }>();
      return (result.results ?? []).map((row) => ({
        id: row.id,
        source: row.source,
        eventType: row.event_type,
        occurredAt: row.occurred_at,
        traceId: row.trace_id,
        payload: row.payload_json ? JSON.parse(row.payload_json) : {}
      }));
    } catch {
      // fallback
    }
  }

  const text = (opts.text ?? "").toLowerCase();
  const rows = eventMemory.filter((event) => {
    if (event.occurredAt < from || event.occurredAt > to) return false;
    if (opts.source && !event.source.toLowerCase().includes(opts.source.toLowerCase())) return false;
    if (opts.eventType && !event.eventType.toLowerCase().includes(opts.eventType.toLowerCase())) return false;
    if (!text) return true;
    const joined = `${event.id} ${event.source} ${event.eventType} ${JSON.stringify(event.payload)}`.toLowerCase();
    return joined.includes(text);
  });
  rows.sort((a, b) =>
    opts.sortOrder === "asc" ? (a.occurredAt < b.occurredAt ? -1 : 1) : a.occurredAt > b.occurredAt ? -1 : 1
  );
  const sliced = rows.slice(offset, offset + opts.pageSize);
  return sliced.map((row) => ({
    id: row.id,
    source: row.source,
    eventType: row.eventType,
    occurredAt: row.occurredAt,
    traceId: row.traceId,
    payload: row.payload
  }));
}

export async function runDataQuery(
  query: {
    dimensions: string[];
    filters: {
      source?: string;
      event_type?: string;
      risk_level?: string;
      from?: string;
      to?: string;
    };
    metrics: string[];
    timeSlice: "hour" | "day";
    limit: number;
  },
  env: WorkerEnv
): Promise<Record<string, unknown>[]> {
  const supportedDimensions = new Set(["source", "event_type", "bucket"]);
  const supportedMetrics = new Set(["event_count", "anomaly_count", "risk_event_count"]);

  const dimensions = query.dimensions.filter((d) => supportedDimensions.has(d));
  const metrics = query.metrics.filter((m) => supportedMetrics.has(m));
  const from = parseIsoOrFallback(query.filters.from ?? null, "1970-01-01T00:00:00.000Z");
  const to = parseIsoOrFallback(query.filters.to ?? null, "9999-12-31T23:59:59.999Z");
  const sourceLike = `%${query.filters.source ?? ""}%`;
  const eventTypeLike = `%${query.filters.event_type ?? ""}%`;
  const riskLike = `%${query.filters.risk_level ?? ""}%`;

  if (env.CIOS_DB && dimensions.length > 0 && metrics.length > 0) {
    try {
      const bucketExpr =
        query.timeSlice === "day"
          ? "strftime('%Y-%m-%dT00:00:00.000Z', occurred_at)"
          : "strftime('%Y-%m-%dT%H:00:00.000Z', occurred_at)";
      const selectParts: string[] = [];
      if (dimensions.includes("source")) selectParts.push("source");
      if (dimensions.includes("event_type")) selectParts.push("event_type");
      if (dimensions.includes("bucket")) selectParts.push(`${bucketExpr} AS bucket`);
      if (metrics.includes("event_count")) selectParts.push("COUNT(*) AS event_count");
      if (metrics.includes("anomaly_count"))
        selectParts.push("SUM(CASE WHEN LOWER(event_type) LIKE '%anomaly%' THEN 1 ELSE 0 END) AS anomaly_count");
      if (metrics.includes("risk_event_count"))
        selectParts.push("SUM(CASE WHEN LOWER(event_type) LIKE '%risk%' THEN 1 ELSE 0 END) AS risk_event_count");

      const groupByParts: string[] = [];
      if (dimensions.includes("source")) groupByParts.push("source");
      if (dimensions.includes("event_type")) groupByParts.push("event_type");
      if (dimensions.includes("bucket")) groupByParts.push("bucket");

      const sql = `
        SELECT ${selectParts.join(", ")}
        FROM api_events
        WHERE occurred_at >= ? AND occurred_at <= ?
          AND source LIKE ?
          AND event_type LIKE ?
          AND payload_json LIKE ?
        GROUP BY ${groupByParts.join(", ")}
        ORDER BY ${groupByParts.join(", ")}
        LIMIT ?
      `;
      const result = await env.CIOS_DB.prepare(sql)
        .bind(from, to, sourceLike, eventTypeLike, riskLike, query.limit)
        .all<Record<string, unknown>>();
      return result.results ?? [];
    } catch {
      // fallback
    }
  }

  const filtered = eventMemory.filter((event) => {
    if (event.occurredAt < from || event.occurredAt > to) return false;
    if (query.filters.source && !event.source.includes(query.filters.source)) return false;
    if (query.filters.event_type && !event.eventType.includes(query.filters.event_type)) return false;
    if (query.filters.risk_level && !JSON.stringify(event.payload).toLowerCase().includes(query.filters.risk_level.toLowerCase()))
      return false;
    return true;
  });
  return [
    {
      fallback: true,
      event_count: filtered.length,
      anomaly_count: filtered.filter((e) => e.eventType.toLowerCase().includes("anomaly")).length,
      risk_event_count: filtered.filter((e) => e.eventType.toLowerCase().includes("risk")).length
    }
  ];
}
