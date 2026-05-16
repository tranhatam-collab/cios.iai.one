ALTER TABLE discovery_sources
  ADD COLUMN IF NOT EXISTS candidate_type TEXT NOT NULL DEFAULT 'source_candidate',
  ADD COLUMN IF NOT EXISTS discovery_method TEXT NOT NULL DEFAULT 'seed_domain',
  ADD COLUMN IF NOT EXISTS preliminary_confidence INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS governance_state TEXT NOT NULL DEFAULT 'review_required',
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS workspace_relevance TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS geo_hints TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS language_hints TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE crawl_governance_decisions
  ADD COLUMN IF NOT EXISTS actor TEXT NOT NULL DEFAULT 'crawl-governance-engine',
  ADD COLUMN IF NOT EXISTS source_governance_state TEXT NOT NULL DEFAULT 'review_required',
  ADD COLUMN IF NOT EXISTS legal_risk_level TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS compliance_class TEXT NOT NULL DEFAULT 'restricted';

UPDATE discovery_sources
SET
  candidate_type = COALESCE(NULLIF(candidate_type, ''), 'source_candidate'),
  discovery_method = COALESCE(NULLIF(discovery_method, ''), 'seed_domain'),
  preliminary_confidence = CASE
    WHEN risk_level = 'low' THEN 78
    WHEN risk_level = 'medium' THEN 61
    ELSE 45
  END,
  governance_state = CASE
    WHEN eligibility = 'allow_limited' THEN 'allowed_with_limits'
    WHEN eligibility = 'manual_review' THEN 'review_required'
    ELSE 'review_required'
  END,
  review_status = CASE
    WHEN eligibility = 'manual_review' THEN 'pending'
    ELSE 'none'
  END,
  workspace_relevance = CASE
    WHEN source_type = 'company-website' THEN 'high'
    ELSE 'medium'
  END,
  geo_hints = CASE
    WHEN source_url ILIKE '%.vn%' THEN ARRAY['VN']::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END,
  language_hints = ARRAY['vi','en']::TEXT[];

UPDATE crawl_governance_decisions
SET
  actor = COALESCE(NULLIF(actor, ''), 'crawl-governance-engine'),
  source_governance_state = CASE
    WHEN decision = 'allow_limited' THEN 'allowed_with_limits'
    WHEN decision = 'manual_review' THEN 'review_required'
    WHEN decision = 'deny' THEN 'blocked'
    ELSE 'review_required'
  END,
  legal_risk_level = CASE
    WHEN decision = 'allow_limited' THEN 'low'
    WHEN decision = 'manual_review' THEN 'medium'
    ELSE 'high'
  END,
  compliance_class = CASE
    WHEN decision = 'allow_limited' THEN 'restricted'
    WHEN decision = 'manual_review' THEN 'restricted'
    ELSE 'blocked'
  END;
