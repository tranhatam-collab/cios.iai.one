CREATE TABLE IF NOT EXISTS realtime_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  trace_id TEXT NOT NULL,
  payload_minimal JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_realtime_events_workspace_id
  ON realtime_events(workspace_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_realtime_events_workspace_event_id
  ON realtime_events(workspace_id, event_id);
