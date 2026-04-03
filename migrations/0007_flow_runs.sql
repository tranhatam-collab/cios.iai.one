CREATE TABLE IF NOT EXISTS flow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  trigger_name TEXT NOT NULL,
  source_decision_id TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'accepted',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  callback_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by UUID,
  approved_by UUID,
  trace_id TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flow_runs_workspace_status_created
  ON flow_runs(workspace_id, status, created_at DESC);
