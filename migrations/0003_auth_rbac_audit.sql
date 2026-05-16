CREATE TABLE IF NOT EXISTS auth_session_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  workspace_code TEXT,
  user_id UUID,
  email TEXT,
  role TEXT,
  event TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_workspace_created
  ON auth_session_audit_logs(workspace_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_audit_event_created
  ON auth_session_audit_logs(event, created_at DESC);
