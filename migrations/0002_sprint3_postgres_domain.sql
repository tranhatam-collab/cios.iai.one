CREATE TABLE IF NOT EXISTS member_plans (
  plan_code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  monthly_usd INTEGER,
  seats_limit INTEGER,
  org_records_limit INTEGER,
  automations_per_day_limit INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  industry TEXT,
  fit_score INTEGER NOT NULL DEFAULT 0,
  intent_score INTEGER NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'new',
  owner_member_id UUID REFERENCES workspace_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_organizations_workspace ON organizations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stage ON organizations(stage);

CREATE TABLE IF NOT EXISTS compliance_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_workspace_created
  ON compliance_audit_logs(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS retention_rules (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  data_class TEXT NOT NULL,
  retention_days INTEGER NOT NULL CHECK (retention_days > 0),
  strategy TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, data_class)
);

CREATE TABLE IF NOT EXISTS discovery_sources (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  eligibility TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_sources_workspace_seen
  ON discovery_sources(workspace_id, first_seen_at DESC);

CREATE TABLE IF NOT EXISTS crawl_governance_decisions (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawl_governance_workspace_decided
  ON crawl_governance_decisions(workspace_id, decided_at DESC);

INSERT INTO member_plans (plan_code, title, monthly_usd, seats_limit, org_records_limit, automations_per_day_limit)
VALUES
  ('free', 'Free', 0, 1, 200, 20),
  ('growth', 'Growth', 49, 5, 5000, 300),
  ('scale', 'Scale', 149, 15, 30000, 1500),
  ('enterprise', 'Enterprise', NULL, NULL, NULL, NULL)
ON CONFLICT (plan_code) DO UPDATE
SET
  title = EXCLUDED.title,
  monthly_usd = EXCLUDED.monthly_usd,
  seats_limit = EXCLUDED.seats_limit,
  org_records_limit = EXCLUDED.org_records_limit,
  automations_per_day_limit = EXCLUDED.automations_per_day_limit,
  updated_at = NOW();

INSERT INTO workspaces (code, name, plan)
VALUES ('demo', 'Demo Workspace', 'growth')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  plan = EXCLUDED.plan,
  updated_at = NOW();

INSERT INTO users (email, password_hash, display_name)
VALUES ('admin@iai.one', '', 'Demo Admin')
ON CONFLICT (email) DO NOTHING;

UPDATE users
SET password_hash = COALESCE(NULLIF(password_hash, ''), 'c6f340f944b99887b7fa5a8f0f5cfcf9:4d86890afe2cebb53f2b8b0ea51f4ca8adf56a14db1320ce3f4bfefd4dc262df03162fb5a88bcd257ec518afdb35ca7c643bf95fdb81be0fd8ef8f95257db5bc')
WHERE email = 'admin@iai.one';

INSERT INTO workspace_members (workspace_id, user_id, role, status)
SELECT w.id, u.id, 'owner', 'active'
FROM workspaces w
JOIN users u ON u.email = 'admin@iai.one'
WHERE w.code = 'demo'
ON CONFLICT (workspace_id, user_id) DO NOTHING;

INSERT INTO organizations (workspace_id, name, domain, industry, fit_score, intent_score, stage, owner_member_id)
SELECT
  w.id,
  seed.name,
  seed.domain,
  seed.industry,
  seed.fit_score,
  seed.intent_score,
  seed.stage,
  wm.id
FROM workspaces w
JOIN workspace_members wm ON wm.workspace_id = w.id
JOIN users u ON u.id = wm.user_id
JOIN (
  VALUES
    ('IAI Logistics', 'iai-logistics.vn', 'Logistics', 82, 64, 'qualified'),
    ('Sao Biotech', 'saobiotech.com', 'Biotech', 75, 51, 'new'),
    ('Tam Commerce', 'tamcommerce.vn', 'Ecommerce Enablement', 91, 78, 'proposal')
) AS seed(name, domain, industry, fit_score, intent_score, stage)
  ON TRUE
WHERE w.code = 'demo' AND u.email = 'admin@iai.one'
ON CONFLICT (workspace_id, domain) DO UPDATE
SET
  name = EXCLUDED.name,
  industry = EXCLUDED.industry,
  fit_score = EXCLUDED.fit_score,
  intent_score = EXCLUDED.intent_score,
  stage = EXCLUDED.stage,
  owner_member_id = EXCLUDED.owner_member_id,
  updated_at = NOW();

INSERT INTO compliance_audit_logs (workspace_id, event_type, message, actor, created_at)
SELECT w.id, x.event_type, x.message, x.actor, x.created_at
FROM workspaces w
JOIN (
  VALUES
    ('policy_decision', 'Domain queued with manual review due to policy ambiguity', 'crawl-governance-engine', NOW() - INTERVAL '6 hours'),
    ('suppression_applied', 'Suppression list matched before outreach workflow', 'workflow-engine', NOW() - INTERVAL '5 hours'),
    ('deletion_request_received', 'Deletion request ticket created and pending verification', 'compliance-ops', NOW() - INTERVAL '4 hours')
) AS x(event_type, message, actor, created_at)
  ON TRUE
WHERE w.code = 'demo'
  AND NOT EXISTS (
    SELECT 1
    FROM compliance_audit_logs existing
    WHERE existing.workspace_id = w.id AND existing.event_type = x.event_type
  );

INSERT INTO retention_rules (workspace_id, data_class, retention_days, strategy)
SELECT w.id, x.data_class, x.retention_days, x.strategy
FROM workspaces w
JOIN (
  VALUES
    ('raw_html_cache', 30, 'ttl_delete'),
    ('derived_company_profile', 365, 'rolling_recompute'),
    ('audit_logs', 730, 'immutable_archive')
) AS x(data_class, retention_days, strategy)
  ON TRUE
WHERE w.code = 'demo'
ON CONFLICT (workspace_id, data_class) DO UPDATE
SET
  retention_days = EXCLUDED.retention_days,
  strategy = EXCLUDED.strategy,
  updated_at = NOW();

INSERT INTO discovery_sources (workspace_id, source_url, source_type, risk_level, eligibility, first_seen_at)
SELECT w.id, x.source_url, x.source_type, x.risk_level, x.eligibility, x.first_seen_at
FROM workspaces w
JOIN (
  VALUES
    ('https://example-manufacturing.vn', 'company-website', 'low', 'allow_limited', NOW() - INTERVAL '1 day'),
    ('https://jobs.example-growth.com', 'job-board-public', 'medium', 'manual_review', NOW() - INTERVAL '18 hours')
) AS x(source_url, source_type, risk_level, eligibility, first_seen_at)
  ON TRUE
WHERE w.code = 'demo'
  AND NOT EXISTS (
    SELECT 1
    FROM discovery_sources ds
    WHERE ds.workspace_id = w.id AND ds.source_url = x.source_url
  );

INSERT INTO crawl_governance_decisions (workspace_id, domain, decision, reason, decided_at)
SELECT w.id, x.domain, x.decision, x.reason, x.decided_at
FROM workspaces w
JOIN (
  VALUES
    ('example-manufacturing.vn', 'allow_limited', 'robots_ok_with_delay', NOW() - INTERVAL '8 hours'),
    ('jobs.example-growth.com', 'manual_review', 'unclear_policy_signals', NOW() - INTERVAL '7 hours')
) AS x(domain, decision, reason, decided_at)
  ON TRUE
WHERE w.code = 'demo'
  AND NOT EXISTS (
    SELECT 1
    FROM crawl_governance_decisions cgd
    WHERE cgd.workspace_id = w.id AND cgd.domain = x.domain
  );
