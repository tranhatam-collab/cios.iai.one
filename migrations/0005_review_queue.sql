CREATE TABLE IF NOT EXISTS review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  review_type TEXT NOT NULL,
  created_from_action TEXT NOT NULL,
  actor_id UUID,
  target_object_type TEXT NOT NULL,
  target_object_id TEXT NOT NULL,
  reason_codes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  evidence_bundle JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'medium',
  assigned_reviewer_id UUID,
  resolution_status TEXT NOT NULL DEFAULT 'pending',
  resolution_note TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_items_workspace_status_created
  ON review_items(workspace_id, resolution_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_items_workspace_type_created
  ON review_items(workspace_id, review_type, created_at DESC);
