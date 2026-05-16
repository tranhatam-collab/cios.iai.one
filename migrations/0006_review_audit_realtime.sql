ALTER TABLE review_items
  ADD COLUMN IF NOT EXISTS required_approvals INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS escalation_target TEXT;

ALTER TABLE compliance_audit_logs
  ADD COLUMN IF NOT EXISTS trace_id TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS target_type TEXT,
  ADD COLUMN IF NOT EXISTS target_id TEXT,
  ADD COLUMN IF NOT EXISTS payload_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_compliance_audit_workspace_action_created
  ON compliance_audit_logs(workspace_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_workspace_trace
  ON compliance_audit_logs(workspace_id, trace_id);
