export type WorkerEnv = {
  CIOS_DB?: D1Database;
  CIOS_KV?: KVNamespace;
  API_CONTRACT?: string;
  JWT_SECRET?: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
};

let initPromise: Promise<void> | null = null;

export async function ensurePersistenceSchema(env: WorkerEnv): Promise<void> {
  if (!env.CIOS_DB) return;
  if (initPromise) {
    await initPromise;
    return;
  }
  initPromise = (async () => {
    await env.CIOS_DB!.prepare(
      `
      CREATE TABLE IF NOT EXISTS api_idempotency_keys (
        idem_key TEXT PRIMARY KEY,
        route TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        created_at_ms INTEGER NOT NULL,
        expires_at_ms INTEGER NOT NULL
      )
      `
    ).run();

    await env.CIOS_DB!.prepare(
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
      `
    ).run();

    await env.CIOS_DB!.prepare(
      "CREATE INDEX IF NOT EXISTS idx_api_audit_logs_at ON api_audit_logs(at DESC)"
    ).run();
  })();

  await initPromise;
}
