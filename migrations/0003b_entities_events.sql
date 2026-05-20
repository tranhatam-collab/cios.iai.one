-- Migration 0003b: core entities and events tables
-- Required before 0004_phase1_core_lock_schema.sql which references entities(id) and events(id)
-- FK issue discovered: entity_relationships, behaviors → entities(id)
--                      system_events, event_logs → events(id)

CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT UNIQUE,
  entity_type TEXT NOT NULL,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  actor_type TEXT,
  actor_id TEXT,
  target_type TEXT,
  target_id TEXT,
  trace_id TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  source_id BIGINT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_entities_type_status
  ON entities(entity_type, status);
CREATE INDEX IF NOT EXISTS idx_entities_code
  ON entities(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_type_created
  ON events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_trace_created
  ON events(trace_id, created_at DESC) WHERE trace_id IS NOT NULL;
