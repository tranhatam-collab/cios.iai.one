CREATE TABLE IF NOT EXISTS api_idempotency_keys (
  idem_key TEXT PRIMARY KEY,
  route TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL
);

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
);

CREATE INDEX IF NOT EXISTS idx_api_audit_logs_at ON api_audit_logs(at DESC);
