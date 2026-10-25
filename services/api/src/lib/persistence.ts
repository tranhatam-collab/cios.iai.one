export type WorkerEnv = {
  CIOS_DB?: D1Database;
  CIOS_KV?: KVNamespace;
  API_CONTRACT?: string;
  JWT_SECRET?: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
  FLOW_WEBHOOK_SECRET?: string;
  AUTH_DEMO_EMAIL?: string;
  AUTH_DEMO_PASSWORD?: string;
  ALLOW_DEMO_SEED?: string;
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

    await env.CIOS_DB!.prepare(
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
      `
    ).run();
    await env.CIOS_DB!.prepare(
      "CREATE INDEX IF NOT EXISTS idx_api_events_occurred_at ON api_events(occurred_at DESC)"
    ).run();

    await env.CIOS_DB!.prepare(
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
      `
    ).run();
    await env.CIOS_DB!.prepare(
      "CREATE INDEX IF NOT EXISTS idx_api_flow_logs_completed_at ON api_flow_logs(completed_at DESC)"
    ).run();

    await env.CIOS_DB!.prepare(
      `
      CREATE TABLE IF NOT EXISTS api_users (
        user_key TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        workspace_id TEXT NOT NULL,
        workspace_code TEXT NOT NULL,
        email TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL,
        plan TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
      `
    ).run();
    await env.CIOS_DB!.prepare(
      "CREATE INDEX IF NOT EXISTS idx_api_users_workspace ON api_users(workspace_code)"
    ).run();

    await env.CIOS_DB!.prepare(
      `
      CREATE TABLE IF NOT EXISTS api_revoked_tokens (
        jti TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        revoked_at_ms INTEGER NOT NULL,
        expires_at_ms INTEGER NOT NULL
      )
      `
    ).run();

    await env.CIOS_DB!.prepare(
      `
      CREATE TABLE IF NOT EXISTS api_organizations (
        id TEXT PRIMARY KEY,
        workspace_code TEXT NOT NULL,
        name TEXT NOT NULL,
        domain TEXT NOT NULL,
        industry TEXT NOT NULL,
        fit_score INTEGER NOT NULL,
        intent_score INTEGER NOT NULL,
        stage TEXT NOT NULL,
        owner TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
      `
    ).run();
    await env.CIOS_DB!.prepare(
      "CREATE INDEX IF NOT EXISTS idx_api_organizations_workspace ON api_organizations(workspace_code, created_at DESC)"
    ).run();

    await env.CIOS_DB!.prepare(
      `
      CREATE TABLE IF NOT EXISTS api_discovery_sources (
        id TEXT PRIMARY KEY,
        workspace_code TEXT NOT NULL,
        candidate_type TEXT NOT NULL,
        source_url TEXT NOT NULL,
        source_type TEXT NOT NULL,
        discovery_method TEXT NOT NULL,
        preliminary_confidence INTEGER NOT NULL,
        governance_state TEXT NOT NULL,
        review_status TEXT NOT NULL,
        workspace_relevance TEXT NOT NULL,
        geo_hints_json TEXT NOT NULL,
        language_hints_json TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        eligibility TEXT NOT NULL,
        first_seen_at TEXT NOT NULL
      )
      `
    ).run();
    await env.CIOS_DB!.prepare(
      "CREATE INDEX IF NOT EXISTS idx_api_discovery_workspace ON api_discovery_sources(workspace_code, first_seen_at DESC)"
    ).run();

    await env.CIOS_DB!.prepare(
      `
      CREATE TABLE IF NOT EXISTS api_compliance_audit (
        id TEXT PRIMARY KEY,
        workspace_code TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        result TEXT NOT NULL,
        details_json TEXT,
        created_at TEXT NOT NULL
      )
      `
    ).run();

    await env.CIOS_DB!.prepare(
      `
      CREATE TABLE IF NOT EXISTS api_review_queue (
        id TEXT PRIMARY KEY,
        workspace_code TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
      `
    ).run();

    await env.CIOS_DB!.prepare(
      `
      CREATE TABLE IF NOT EXISTS api_crawl_governance (
        id TEXT PRIMARY KEY,
        workspace_code TEXT NOT NULL,
        decision TEXT NOT NULL,
        source_url TEXT NOT NULL,
        reason TEXT NOT NULL,
        decided_at TEXT NOT NULL
      )
      `
    ).run();
  })();

  await initPromise;
}

/** Isolate-local fallback when neither KV nor D1 is bound (dev/tests). */
const memoryRevoked = new Map<string, number>();

function pruneMemoryRevoked(nowMs: number): void {
  for (const [jti, expiresAt] of memoryRevoked) {
    if (expiresAt <= nowMs) memoryRevoked.delete(jti);
  }
}

export async function isTokenRevoked(
  env: WorkerEnv,
  jti: string,
  nowMs = Date.now()
): Promise<boolean> {
  if (!jti) return false;

  if (env.CIOS_KV) {
    const hit = await env.CIOS_KV.get(`revoked:jti:${jti}`);
    if (hit) return true;
  }

  if (env.CIOS_DB) {
    await ensurePersistenceSchema(env);
    await env.CIOS_DB.prepare("DELETE FROM api_revoked_tokens WHERE expires_at_ms < ?")
      .bind(nowMs)
      .run();
    const row = await env.CIOS_DB.prepare(
      "SELECT jti FROM api_revoked_tokens WHERE jti = ? LIMIT 1"
    )
      .bind(jti)
      .first<{ jti: string }>();
    if (row) return true;
  }

  pruneMemoryRevoked(nowMs);
  const memExp = memoryRevoked.get(jti);
  return typeof memExp === "number" && memExp > nowMs;
}

export async function revokeToken(
  env: WorkerEnv,
  params: { jti: string; userId: string; expiresAtMs: number }
): Promise<void> {
  const nowMs = Date.now();
  const ttlSec = Math.max(1, Math.floor((params.expiresAtMs - nowMs) / 1000));

  if (env.CIOS_KV) {
    await env.CIOS_KV.put(`revoked:jti:${params.jti}`, "1", { expirationTtl: ttlSec });
  }

  if (env.CIOS_DB) {
    await ensurePersistenceSchema(env);
    await env.CIOS_DB.prepare(
      `
      INSERT OR REPLACE INTO api_revoked_tokens (jti, user_id, revoked_at_ms, expires_at_ms)
      VALUES (?, ?, ?, ?)
      `
    )
      .bind(params.jti, params.userId, nowMs, params.expiresAtMs)
      .run();
  }

  // Always keep isolate memory denylist so logout works without bindings.
  memoryRevoked.set(params.jti, params.expiresAtMs);
}
