-- FILE: DATABASE_SCHEMA.sql
-- CUSTOMER INTELLIGENCE OS
-- PostgreSQL Production Schema
-- Version: v1
-- Notes:
-- 1) Multi-tenant by design
-- 2) Compliance-first
-- 3) Source lineage bắt buộc
-- 4) Audit append-only
-- 5) Soft delete cho entity chính
-- 6) Không dùng schema này để lưu dữ liệu riêng tư không hợp pháp
-- 7) Chỉ dành cho dữ liệu công khai hợp pháp + CRM operations nội bộ

BEGIN;

-- =========================================================
-- EXTENSIONS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================================================
-- ENUMS
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_code') THEN
    CREATE TYPE plan_code AS ENUM ('free', 'starter', 'growth', 'pro', 'enterprise');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
    CREATE TYPE member_status AS ENUM ('invited', 'active', 'suspended', 'removed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_role') THEN
    CREATE TYPE workspace_role AS ENUM (
      'owner',
      'admin',
      'compliance_admin',
      'sales_manager',
      'sales_rep',
      'analyst',
      'reviewer',
      'finance',
      'support',
      'readonly'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_status') THEN
    CREATE TYPE record_status AS ENUM ('active', 'archived', 'deleted');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type') THEN
    CREATE TYPE source_type AS ENUM (
      'website',
      'registry',
      'social_company_page',
      'blog',
      'job_posting',
      'structured_data',
      'manual_import',
      'api_feed',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'policy_decision') THEN
    CREATE TYPE policy_decision AS ENUM ('allow', 'allow_limited', 'manual_review', 'deny');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crawl_job_status') THEN
    CREATE TYPE crawl_job_status AS ENUM ('queued', 'running', 'success', 'partial_success', 'failed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
    CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'needs_more_info');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type') THEN
    CREATE TYPE entity_type AS ENUM (
      'organization',
      'contact',
      'lead',
      'opportunity',
      'source_record',
      'workflow',
      'export',
      'deletion_request',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE lead_status AS ENUM ('new', 'qualified', 'working', 'nurturing', 'disqualified', 'converted');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunity_status') THEN
    CREATE TYPE opportunity_status AS ENUM ('open', 'won', 'lost', 'on_hold');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled', 'overdue');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
    CREATE TYPE activity_type AS ENUM (
      'note',
      'email',
      'call',
      'meeting',
      'task',
      'status_change',
      'import',
      'system',
      'review',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signal_type') THEN
    CREATE TYPE signal_type AS ENUM (
      'hiring',
      'new_product',
      'website_update',
      'content_increase',
      'market_expansion',
      'sales_growth_hint',
      'tech_stack_change',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'legal_basis_tag') THEN
    CREATE TYPE legal_basis_tag AS ENUM (
      'public_business_contact',
      'legitimate_interest_b2b',
      'consent',
      'contract',
      'legal_obligation',
      'manual_review_required',
      'not_applicable'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'suppression_scope') THEN
    CREATE TYPE suppression_scope AS ENUM ('email', 'phone', 'domain', 'organization', 'workspace_global');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deletion_request_status') THEN
    CREATE TYPE deletion_request_status AS ENUM ('submitted', 'in_review', 'approved', 'rejected', 'completed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_type') THEN
    CREATE TYPE workflow_type AS ENUM (
      'daily_discovery',
      'daily_crawl',
      'stale_refresh',
      'score_recompute',
      'hot_lead_alert',
      'assign_owner',
      'create_followup_task',
      'export_review',
      'suppression_sync',
      'retention_purge',
      'custom'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_status') THEN
    CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'paused', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_run_status') THEN
    CREATE TYPE workflow_run_status AS ENUM ('queued', 'running', 'success', 'partial_success', 'failed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_status') THEN
    CREATE TYPE export_status AS ENUM ('requested', 'approved', 'rejected', 'processing', 'completed', 'expired', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'error', 'compliance', 'billing', 'alert');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'usage_metric_code') THEN
    CREATE TYPE usage_metric_code AS ENUM (
      'records_viewed',
      'records_refreshed',
      'ai_summaries',
      'ai_scoring_runs',
      'exports_count',
      'workflow_runs',
      'api_calls',
      'seats_used',
      'proof_snapshots'
    );
  END IF;
END $$;

-- =========================================================
-- COMMON HELPERS
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- WORKSPACES / USERS / ACCESS
-- =========================================================

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug CITEXT NOT NULL UNIQUE,
  plan plan_code NOT NULL DEFAULT 'free',
  status record_status NOT NULL DEFAULT 'active',
  region_code VARCHAR(32),
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  billing_email CITEXT,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  status record_status NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  auth_provider VARCHAR(64),
  locale VARCHAR(16) DEFAULT 'vi',
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL,
  status member_status NOT NULL DEFAULT 'invited',
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, code)
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_id, permission_id)
);

-- =========================================================
-- BILLING / SUBSCRIPTIONS / USAGE
-- =========================================================

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code plan_code NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  monthly_price_cents BIGINT NOT NULL DEFAULT 0,
  annual_price_cents BIGINT NOT NULL DEFAULT 0,
  feature_flags_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  external_subscription_id VARCHAR(255),
  status VARCHAR(64) NOT NULL DEFAULT 'active',
  billing_cycle VARCHAR(32) NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  metric usage_metric_code NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  quantity BIGINT NOT NULL DEFAULT 0,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, metric, period_start, period_end)
);

-- =========================================================
-- CORE CRM
-- =========================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  legal_name VARCHAR(255),
  brand_name VARCHAR(255),
  normalized_name VARCHAR(255),
  primary_domain CITEXT,
  secondary_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  industry VARCHAR(128),
  subindustry VARCHAR(128),
  country VARCHAR(128),
  city VARCHAR(128),
  public_address TEXT,
  company_size_estimate VARCHAR(64),
  employee_range VARCHAR(64),
  company_summary TEXT,
  public_contact_email CITEXT,
  public_contact_phone VARCHAR(64),
  linkedin_url TEXT,
  facebook_url TEXT,
  youtube_url TEXT,
  source_confidence NUMERIC(5,2),
  freshness_score NUMERIC(5,2),
  legal_basis legal_basis_tag NOT NULL DEFAULT 'public_business_contact',
  retention_class VARCHAR(64) NOT NULL DEFAULT 'standard',
  status record_status NOT NULL DEFAULT 'active',
  owner_user_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_organizations_workspace ON organizations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(primary_domain);
CREATE INDEX IF NOT EXISTS idx_organizations_normalized_name ON organizations(normalized_name);
CREATE INDEX IF NOT EXISTS idx_organizations_industry ON organizations(workspace_id, industry);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(workspace_id, status);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  full_name VARCHAR(255),
  role_title VARCHAR(255),
  public_business_email CITEXT,
  public_business_phone VARCHAR(64),
  linkedin_public_url TEXT,
  source_url TEXT,
  source_visibility VARCHAR(64) DEFAULT 'public',
  contactability_class VARCHAR(64) DEFAULT 'business_public',
  do_not_contact BOOLEAN NOT NULL DEFAULT FALSE,
  suppression_reason TEXT,
  legal_basis legal_basis_tag NOT NULL DEFAULT 'public_business_contact',
  retention_expires_at TIMESTAMPTZ,
  status record_status NOT NULL DEFAULT 'active',
  owner_user_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(public_business_email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(workspace_id, status);

CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  status record_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, code)
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL,
  position INTEGER NOT NULL,
  win_probability NUMERIC(5,2),
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  is_won BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pipeline_id, code),
  UNIQUE (pipeline_id, position)
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  current_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  status lead_status NOT NULL DEFAULT 'new',
  title VARCHAR(255),
  source_channel VARCHAR(64) DEFAULT 'public_data',
  fit_score NUMERIC(5,2),
  intent_score NUMERIC(5,2),
  timing_score NUMERIC(5,2),
  compliance_score NUMERIC(5,2),
  priority_score NUMERIC(5,2),
  owner_user_id UUID REFERENCES users(id),
  qualified_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  disqualified_reason TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leads_workspace ON leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_contact ON leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(workspace_id, priority_score DESC);

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  current_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  status opportunity_status NOT NULL DEFAULT 'open',
  name VARCHAR(255) NOT NULL,
  amount_cents BIGINT,
  currency VARCHAR(8) DEFAULT 'USD',
  expected_close_date DATE,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  loss_reason TEXT,
  owner_user_id UUID REFERENCES users(id),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_opportunities_workspace ON opportunities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(workspace_id, owner_user_id);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  related_entity_type entity_type,
  related_entity_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(workspace_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(workspace_id, due_at);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  related_entity_type entity_type NOT NULL,
  related_entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  visibility VARCHAR(32) NOT NULL DEFAULT 'internal',
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notes_related ON notes(workspace_id, related_entity_type, related_entity_id);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  related_entity_type entity_type NOT NULL,
  related_entity_id UUID NOT NULL,
  activity_type activity_type NOT NULL,
  title VARCHAR(255),
  body TEXT,
  actor_user_id UUID REFERENCES users(id),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_related ON activities(workspace_id, related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(workspace_id, created_at DESC);

-- =========================================================
-- SOURCE GOVERNANCE / CRAWL / LINEAGE
-- =========================================================

CREATE TABLE IF NOT EXISTS domain_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  domain CITEXT NOT NULL,
  source_type source_type NOT NULL DEFAULT 'website',
  robots_status VARCHAR(64),
  crawl_delay_ms INTEGER,
  terms_review_status review_status NOT NULL DEFAULT 'pending',
  policy_decision policy_decision NOT NULL DEFAULT 'manual_review',
  deny_reason TEXT,
  allowlist BOOLEAN NOT NULL DEFAULT FALSE,
  blocklist BOOLEAN NOT NULL DEFAULT FALSE,
  last_checked_at TIMESTAMPTZ,
  next_check_at TIMESTAMPTZ,
  policy_notes TEXT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_domain_policies_decision ON domain_policies(workspace_id, policy_decision);

CREATE TABLE IF NOT EXISTS crawl_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) NOT NULL,
  max_requests_per_minute INTEGER NOT NULL DEFAULT 30,
  max_pages_per_domain_per_day INTEGER NOT NULL DEFAULT 100,
  timeout_ms INTEGER NOT NULL DEFAULT 15000,
  retries INTEGER NOT NULL DEFAULT 2,
  respect_robots BOOLEAN NOT NULL DEFAULT TRUE,
  allow_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, code)
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  domain_policy_id UUID REFERENCES domain_policies(id) ON DELETE SET NULL,
  crawl_policy_id UUID REFERENCES crawl_policies(id) ON DELETE SET NULL,
  job_status crawl_job_status NOT NULL DEFAULT 'queued',
  seed_url TEXT NOT NULL,
  source_type source_type NOT NULL DEFAULT 'website',
  pages_requested INTEGER NOT NULL DEFAULT 0,
  pages_succeeded INTEGER NOT NULL DEFAULT 0,
  pages_failed INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  last_error TEXT,
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_workspace_status ON crawl_jobs(workspace_id, job_status);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_created_at ON crawl_jobs(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS source_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  field_name VARCHAR(128) NOT NULL,
  raw_value TEXT,
  normalized_value TEXT,
  source_url TEXT NOT NULL,
  source_title TEXT,
  source_type source_type NOT NULL DEFAULT 'website',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  crawl_job_id UUID REFERENCES crawl_jobs(id) ON DELETE SET NULL,
  proof_hash VARCHAR(128),
  robots_status VARCHAR(64),
  confidence NUMERIC(5,2),
  legal_basis legal_basis_tag NOT NULL DEFAULT 'public_business_contact',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_records_entity ON source_records(workspace_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_source_records_field ON source_records(workspace_id, field_name);
CREATE INDEX IF NOT EXISTS idx_source_records_source_url ON source_records(workspace_id, source_url);

CREATE TABLE IF NOT EXISTS source_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_record_id UUID NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  proof_type VARCHAR(64) NOT NULL DEFAULT 'hash',
  proof_hash VARCHAR(128) NOT NULL,
  storage_url TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retention_expires_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  field_name VARCHAR(128) NOT NULL,
  source_record_id UUID REFERENCES source_records(id) ON DELETE SET NULL,
  lineage_type VARCHAR(64) NOT NULL DEFAULT 'source_backed',
  derived_from_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_version_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_lineage_entity ON field_lineage(workspace_id, entity_type, entity_id, field_name);

CREATE TABLE IF NOT EXISTS entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  left_entity_type entity_type NOT NULL,
  left_entity_id UUID NOT NULL,
  right_entity_type entity_type NOT NULL,
  right_entity_id UUID NOT NULL,
  link_type VARCHAR(64) NOT NULL,
  confidence NUMERIC(5,2),
  matched_by_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_auto_merged BOOLEAN NOT NULL DEFAULT FALSE,
  reversible BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_links_left ON entity_links(workspace_id, left_entity_type, left_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_links_right ON entity_links(workspace_id, right_entity_type, right_entity_id);

CREATE TABLE IF NOT EXISTS review_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  queue_type VARCHAR(64) NOT NULL,
  reason TEXT NOT NULL,
  review_status review_status NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES users(id),
  resolution_notes TEXT,
  created_by UUID REFERENCES users(id),
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_review_queues_status ON review_queues(workspace_id, review_status);
CREATE INDEX IF NOT EXISTS idx_review_queues_assigned_to ON review_queues(workspace_id, assigned_to);

-- =========================================================
-- AI / SIGNALS / SCORING
-- =========================================================

CREATE TABLE IF NOT EXISTS model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  model_name VARCHAR(255) NOT NULL,
  model_family VARCHAR(128),
  version_label VARCHAR(128) NOT NULL,
  provider VARCHAR(128),
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_versions_workspace ON model_versions(workspace_id, model_name);

CREATE TABLE IF NOT EXISTS ai_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  enrichment_type VARCHAR(64) NOT NULL,
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanation TEXT,
  confidence NUMERIC(5,2),
  model_version_id UUID REFERENCES model_versions(id) ON DELETE SET NULL,
  cost_units NUMERIC(12,4),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_enrichments_entity ON ai_enrichments(workspace_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_enrichments_type ON ai_enrichments(workspace_id, enrichment_type);

CREATE TABLE IF NOT EXISTS signal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  signal_type signal_type NOT NULL,
  signal_strength NUMERIC(5,2),
  title VARCHAR(255),
  description TEXT,
  source_record_id UUID REFERENCES source_records(id) ON DELETE SET NULL,
  detected_by VARCHAR(64) NOT NULL DEFAULT 'system',
  model_version_id UUID REFERENCES model_versions(id) ON DELETE SET NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_signal_events_org ON signal_events(workspace_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_signal_events_type ON signal_events(workspace_id, signal_type);

CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  fit_score NUMERIC(5,2),
  intent_score NUMERIC(5,2),
  timing_score NUMERIC(5,2),
  compliance_score NUMERIC(5,2),
  priority_score NUMERIC(5,2),
  explanation TEXT,
  feature_contributions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version_id UUID REFERENCES model_versions(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_lead ON lead_scores(workspace_id, lead_id, generated_at DESC);

-- =========================================================
-- COMPLIANCE / CONSENT / SUPPRESSION / RETENTION
-- =========================================================

CREATE TABLE IF NOT EXISTS legal_basis_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  legal_basis legal_basis_tag NOT NULL,
  justification TEXT,
  jurisdiction VARCHAR(64),
  review_status review_status NOT NULL DEFAULT 'approved',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_basis_entity ON legal_basis_records(workspace_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  consent_type VARCHAR(64) NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  source VARCHAR(128),
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_entity ON consent_records(workspace_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  scope suppression_scope NOT NULL,
  value TEXT NOT NULL,
  reason TEXT,
  source VARCHAR(128) DEFAULT 'user_request',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, scope, value)
);

CREATE INDEX IF NOT EXISTS idx_suppression_active ON suppression_list(workspace_id, active);

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  requester_email CITEXT,
  entity_type entity_type,
  entity_id UUID,
  request_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status deletion_request_status NOT NULL DEFAULT 'submitted',
  reason TEXT,
  review_notes TEXT,
  approved_by UUID REFERENCES users(id),
  completed_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(workspace_id, status);

CREATE TABLE IF NOT EXISTS retention_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  retention_days INTEGER NOT NULL,
  purge_mode VARCHAR(32) NOT NULL DEFAULT 'soft_then_hard',
  applies_to_status VARCHAR(64),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, entity_type, applies_to_status)
);

-- =========================================================
-- WORKFLOWS / EXPORTS / WEBHOOKS / API KEYS
-- =========================================================

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workflow_type workflow_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(128) NOT NULL,
  status workflow_status NOT NULL DEFAULT 'draft',
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  run_status workflow_run_status NOT NULL DEFAULT 'queued',
  idempotency_key VARCHAR(255),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retries INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, workflow_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(workspace_id, run_status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  export_type VARCHAR(64) NOT NULL,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_count INTEGER,
  status export_status NOT NULL DEFAULT 'requested',
  file_url TEXT,
  watermark_id VARCHAR(128),
  expires_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reason TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_exports_status ON exports(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_exports_requested_by ON exports(workspace_id, requested_by);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(32) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  scopes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_url TEXT NOT NULL,
  secret_hash VARCHAR(255),
  event_types_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_delivery_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- NOTIFICATIONS / AUDIT / PRIVACY / SECURITY
-- =========================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  body TEXT,
  related_entity_type entity_type,
  related_entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(workspace_id, user_id, is_read);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id),
  action VARCHAR(128) NOT NULL,
  entity_type entity_type,
  entity_id UUID,
  before_json JSONB,
  after_json JSONB,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_created ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(workspace_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS privacy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  entity_type entity_type,
  entity_id UUID,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  severity VARCHAR(32) NOT NULL DEFAULT 'medium',
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- TRIGGERS
-- =========================================================

DROP TRIGGER IF EXISTS trg_workspaces_updated_at ON workspaces;
CREATE TRIGGER trg_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_workspace_members_updated_at ON workspace_members;
CREATE TRIGGER trg_workspace_members_updated_at
BEFORE UPDATE ON workspace_members
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_plans_updated_at ON plans;
CREATE TRIGGER trg_plans_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_usage_counters_updated_at ON usage_counters;
CREATE TRIGGER trg_usage_counters_updated_at
BEFORE UPDATE ON usage_counters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON contacts;
CREATE TRIGGER trg_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pipelines_updated_at ON pipelines;
CREATE TRIGGER trg_pipelines_updated_at
BEFORE UPDATE ON pipelines
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pipeline_stages_updated_at ON pipeline_stages;
CREATE TRIGGER trg_pipeline_stages_updated_at
BEFORE UPDATE ON pipeline_stages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_opportunities_updated_at ON opportunities;
CREATE TRIGGER trg_opportunities_updated_at
BEFORE UPDATE ON opportunities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_notes_updated_at ON notes;
CREATE TRIGGER trg_notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_domain_policies_updated_at ON domain_policies;
CREATE TRIGGER trg_domain_policies_updated_at
BEFORE UPDATE ON domain_policies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_crawl_policies_updated_at ON crawl_policies;
CREATE TRIGGER trg_crawl_policies_updated_at
BEFORE UPDATE ON crawl_policies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_retention_rules_updated_at ON retention_rules;
CREATE TRIGGER trg_retention_rules_updated_at
BEFORE UPDATE ON retention_rules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_workflows_updated_at ON workflows;
CREATE TRIGGER trg_workflows_updated_at
BEFORE UPDATE ON workflows
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_webhooks_updated_at ON webhooks;
CREATE TRIGGER trg_webhooks_updated_at
BEFORE UPDATE ON webhooks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- SEED: PLANS
-- =========================================================

INSERT INTO plans (code, name, monthly_price_cents, annual_price_cents, feature_flags_json, limits_json)
VALUES
  ('free', 'Free', 0, 0, '{"ai_summary": false, "exports": false, "compliance_console": false}'::jsonb, '{"records_viewed": 50, "users": 1}'::jsonb),
  ('starter', 'Starter', 4900, 49000, '{"ai_summary": true, "exports": true, "compliance_console": false}'::jsonb, '{"records_viewed": 2000, "users": 3}'::jsonb),
  ('growth', 'Growth', 19900, 199000, '{"ai_summary": true, "exports": true, "compliance_console": false, "lead_scoring": true}'::jsonb, '{"records_viewed": 20000, "users": 10}'::jsonb),
  ('pro', 'Pro', 49900, 499000, '{"ai_summary": true, "exports": true, "compliance_console": true, "lead_scoring": true, "api_access": true}'::jsonb, '{"records_viewed": 100000, "users": 30}'::jsonb),
  ('enterprise', 'Enterprise', 0, 0, '{"ai_summary": true, "exports": true, "compliance_console": true, "lead_scoring": true, "api_access": true, "sso": true}'::jsonb, '{"records_viewed": -1, "users": -1}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- SEED: PERMISSIONS
-- =========================================================

INSERT INTO permissions (code, name, description)
VALUES
  ('workspace.view', 'View workspace', 'Can view workspace basics'),
  ('organization.view', 'View organizations', 'Can view organization records'),
  ('organization.edit', 'Edit organizations', 'Can edit organization records'),
  ('contact.view', 'View contacts', 'Can view contact records'),
  ('contact.edit', 'Edit contacts', 'Can edit contact records'),
  ('lead.view', 'View leads', 'Can view leads'),
  ('lead.edit', 'Edit leads', 'Can edit leads'),
  ('opportunity.view', 'View opportunities', 'Can view opportunities'),
  ('opportunity.edit', 'Edit opportunities', 'Can edit opportunities'),
  ('task.view', 'View tasks', 'Can view tasks'),
  ('task.edit', 'Edit tasks', 'Can edit tasks'),
  ('workflow.view', 'View workflows', 'Can view workflows'),
  ('workflow.edit', 'Edit workflows', 'Can edit workflows'),
  ('compliance
  -- FILE: DATABASE_SCHEMA.sql
-- CUSTOMER INTELLIGENCE OS
-- PostgreSQL Production Schema (Multi-tenant, Compliance-first)

-- ==================================================
-- EXTENSIONS
-- ==================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================================================
-- CORE: WORKSPACES / TENANT
-- ==================================================

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),
    user_id UUID NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- ORGANIZATIONS
-- ==================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    legal_name TEXT,
    brand_name TEXT,
    normalized_name TEXT,

    primary_domain TEXT,
    secondary_domains TEXT[],

    industry TEXT,
    subindustry TEXT,

    country TEXT,
    city TEXT,
    public_address TEXT,

    company_size_estimate TEXT,
    employee_range TEXT,

    company_summary TEXT,

    public_contact_email TEXT,
    public_contact_phone TEXT,

    linkedin_url TEXT,
    facebook_url TEXT,
    youtube_url TEXT,

    source_confidence FLOAT,
    freshness_score FLOAT,

    legal_basis_tag TEXT,
    retention_class TEXT,

    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_org_workspace ON organizations(workspace_id);
CREATE INDEX idx_org_domain ON organizations(primary_domain);

-- ==================================================
-- CONTACTS
-- ==================================================

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),
    organization_id UUID REFERENCES organizations(id),

    full_name TEXT,
    role_title TEXT,

    public_business_email TEXT,
    public_business_phone TEXT,

    linkedin_public_url TEXT,

    source_url TEXT,
    source_visibility TEXT,

    contactability_class TEXT,

    do_not_contact BOOLEAN DEFAULT FALSE,
    suppression_reason TEXT,

    legal_basis_tag TEXT,
    retention_expires_at TIMESTAMP,

    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contact_org ON contacts(organization_id);

-- ==================================================
-- LEADS
-- ==================================================

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),
    organization_id UUID REFERENCES organizations(id),
    contact_id UUID REFERENCES contacts(id),

    status TEXT,
    owner_id UUID,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- PIPELINES
-- ==================================================

CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),
    name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES pipelines(id),
    name TEXT,
    position INT
);

CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),
    lead_id UUID REFERENCES leads(id),
    stage_id UUID REFERENCES pipeline_stages(id),

    value NUMERIC,
    close_probability FLOAT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- ACTIVITIES
-- ==================================================

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),
    lead_id UUID REFERENCES leads(id),

    type TEXT,
    description TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    title TEXT,
    assigned_to UUID,
    due_date TIMESTAMP,
    status TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    entity_type TEXT,
    entity_id UUID,

    content TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- SOURCE RECORDS (CỰC QUAN TRỌNG)
-- ==================================================

CREATE TABLE source_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    entity_type TEXT,
    entity_id UUID,

    field_name TEXT,
    raw_value TEXT,
    normalized_value TEXT,

    source_url TEXT,
    source_title TEXT,
    source_type TEXT,

    first_seen_at TIMESTAMP,
    last_seen_at TIMESTAMP,

    crawl_job_id UUID,

    proof_hash TEXT,

    robots_status TEXT,
    confidence FLOAT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_source_entity ON source_records(entity_id);

-- ==================================================
-- AI ENRICHMENT
-- ==================================================

CREATE TABLE ai_enrichments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    entity_type TEXT,
    entity_id UUID,

    summary TEXT,
    industry TEXT,
    signals JSONB,
    recommendations JSONB,

    model_version TEXT,
    confidence FLOAT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- LEAD SCORING
-- ==================================================

CREATE TABLE lead_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    lead_id UUID REFERENCES leads(id),

    fit_score FLOAT,
    intent_score FLOAT,
    timing_score FLOAT,
    compliance_score FLOAT,
    priority_score FLOAT,

    explanation TEXT,

    model_version TEXT,
    generated_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- SIGNAL EVENTS
-- ==================================================

CREATE TABLE signal_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    organization_id UUID REFERENCES organizations(id),

    signal_type TEXT,
    signal_data JSONB,

    detected_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- CRAWL SYSTEM
-- ==================================================

CREATE TABLE crawl_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain TEXT,
    status TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error TEXT
);

CREATE TABLE domain_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain TEXT UNIQUE,
    robots_status TEXT,
    crawl_allowed BOOLEAN,
    risk_level TEXT,
    last_checked TIMESTAMP
);

-- ==================================================
-- COMPLIANCE
-- ==================================================

CREATE TABLE suppression_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),
    email TEXT,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    entity_type TEXT,
    entity_id UUID,

    status TEXT,
    requested_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    user_id UUID,
    action TEXT,
    entity_type TEXT,
    entity_id UUID,

    metadata JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- BILLING
-- ==================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    plan TEXT,
    status TEXT,

    started_at TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE usage_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    metric TEXT,
    value INT DEFAULT 0,

    period_start TIMESTAMP,
    period_end TIMESTAMP
);

-- ==================================================
-- EXPORT LOGS
-- ==================================================

CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    user_id UUID,
    export_type TEXT,
    record_count INT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- SECURITY EVENTS
-- ==================================================

CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id),

    event_type TEXT,
    metadata JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);
