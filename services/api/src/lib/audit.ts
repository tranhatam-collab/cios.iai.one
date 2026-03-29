import { ensurePersistenceSchema, type WorkerEnv } from "./persistence";

type AuditEntry = {
  at: string;
  route: string;
  action: string;
  actor: string;
  role: string;
  result: "success" | "failed";
  traceId: string;
  details?: unknown;
};

const auditStore: AuditEntry[] = [];

export async function writeAudit(entry: AuditEntry, env?: WorkerEnv): Promise<void> {
  if (env?.CIOS_DB) {
    try {
      await ensurePersistenceSchema(env);
      await env.CIOS_DB.prepare(
        `
        INSERT INTO api_audit_logs (at, route, action, actor, role, result, trace_id, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
        .bind(
          entry.at,
          entry.route,
          entry.action,
          entry.actor,
          entry.role,
          entry.result,
          entry.traceId,
          entry.details ? JSON.stringify(entry.details) : null
        )
        .run();
      return;
    } catch {
      // Fall through to KV/memory fallback.
    }
  }

  if (env?.CIOS_KV) {
    try {
      const key = `audit:${Date.now()}:${crypto.randomUUID()}`;
      await env.CIOS_KV.put(key, JSON.stringify(entry), { expirationTtl: 30 * 24 * 60 * 60 });
      return;
    } catch {
      // Fall through to memory fallback.
    }
  }

  auditStore.unshift(entry);
  if (auditStore.length > 500) {
    auditStore.length = 500;
  }
}

export async function listAudit(limit = 50, env?: WorkerEnv): Promise<AuditEntry[]> {
  if (env?.CIOS_DB) {
    try {
      await ensurePersistenceSchema(env);
      const result = await env.CIOS_DB.prepare(
        `
        SELECT at, route, action, actor, role, result, trace_id, details_json
        FROM api_audit_logs
        ORDER BY at DESC
        LIMIT ?
        `
      )
        .bind(limit)
        .all<{
          at: string;
          route: string;
          action: string;
          actor: string;
          role: string;
          result: "success" | "failed";
          trace_id: string;
          details_json: string | null;
        }>();
      return (result.results ?? []).map((row) => ({
        at: row.at,
        route: row.route,
        action: row.action,
        actor: row.actor,
        role: row.role,
        result: row.result,
        traceId: row.trace_id,
        details: row.details_json ? JSON.parse(row.details_json) : undefined
      }));
    } catch {
      // Fall through to KV/memory fallback.
    }
  }

  if (env?.CIOS_KV) {
    try {
      const listed = await env.CIOS_KV.list({ prefix: "audit:", limit: Math.min(limit * 2, 1000) });
      const loaded = await Promise.all(
        listed.keys.map(async (keyInfo) => {
          const raw = await env.CIOS_KV!.get(keyInfo.name);
          return raw ? (JSON.parse(raw) as AuditEntry) : null;
        })
      );
      const data = loaded.filter((x): x is AuditEntry => Boolean(x));
      data.sort((a, b) => (a.at < b.at ? 1 : -1));
      return data.slice(0, limit);
    } catch {
      // Fall through to memory fallback.
    }
  }

  return auditStore.slice(0, limit);
}
