export type WorkerEnv = {
  CIOS_DB?: D1Database;
  CIOS_KV?: KVNamespace;
  API_CONTRACT?: string;
  JWT_SECRET?: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
  AUTH_DEMO_PASSWORD?: string;
  FLOW_WEBHOOK_SECRET?: string;
};

let initPromise: Promise<void> | null = null;

export async function ensurePersistenceSchema(env: WorkerEnv): Promise<void> {
  if (!env.CIOS_DB) return;
  if (initPromise) {
    await initPromise;
    return;
  }
  initPromise = (async () => {
    await env
      .CIOS_DB!.prepare(
        `
      CREATE TABLE IF NOT EXISTS api_idempotency_keys (
        idem_key TEXT PRIMARY KEY,
        route TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        created_at_ms INTEGER NOT NULL,
        expires_at_ms INTEGER NOT NULL
      )
      `,
      )
      .run();

    await env
      .CIOS_DB!.prepare(
        `
      CREATE TABLE IF NOT EXISTS api_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        at TEXT NOT NULL,
        route TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        role TEXT NOT NULL,
        result TEXT NOT NULL,
        trace_id TEXT NOT NULL,
        details_json TEXT
      )
      `,
      )
      .run();

    await env
      .CIOS_DB!.prepare(
        "CREATE INDEX IF NOT EXISTS idx_api_audit_logs_at ON api_audit_logs(at DESC)",
      )
      .run();

    await env
      .CIOS_DB!.prepare(
        `
      CREATE TABLE IF NOT EXISTS api_events (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        event_type TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        trace_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
      `,
      )
      .run();
    await env
      .CIOS_DB!.prepare(
        "CREATE INDEX IF NOT EXISTS idx_api_events_occurred_at ON api_events(occurred_at DESC)",
      )
      .run();

    await env
      .CIOS_DB!.prepare(
        `
      CREATE TABLE IF NOT EXISTS api_flow_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flow_run_id TEXT NOT NULL,
        trigger_name TEXT NOT NULL,
        status TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        trace_id TEXT NOT NULL,
        payload_json TEXT
      )
      `,
      )
      .run();
    await env
      .CIOS_DB!.prepare(
        "CREATE INDEX IF NOT EXISTS idx_api_flow_logs_completed_at ON api_flow_logs(completed_at DESC)",
      )
      .run();
  })();

  await initPromise;
}
