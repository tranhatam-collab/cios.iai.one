-- Migration 0003b: Core entity and event tables
-- Required before 0004_phase1_core_lock_schema.sql which FKs against both tables.
-- entities.id: UUID (entity_relationships + behaviors FK as UUID)
-- events.id:   BIGINT (system_events + event_logs FK as BIGINT)

CREATE TABLE IF NOT EXISTS entities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id   TEXT UNIQUE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code        TEXT,
  name        TEXT NOT NULL,
  entity_type_code TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  source_id   BIGINT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  TEXT,
  UNIQUE (workspace_id, code)
);

CREATE INDEX IF NOT EXISTS idx_entities_workspace_status
  ON entities(workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entities_type_workspace
  ON entities(entity_type_code, workspace_id);

CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  public_id   TEXT UNIQUE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  actor_type  TEXT,
  actor_id    TEXT,
  target_type TEXT,
  target_id   TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status      TEXT NOT NULL DEFAULT 'active',
  source_id   BIGINT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_workspace_type_created
  ON events(workspace_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_actor
  ON events(actor_type, actor_id, created_at DESC);
