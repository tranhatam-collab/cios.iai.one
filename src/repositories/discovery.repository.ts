import { dbPool } from "../bootstrap/db.js";

export async function getDiscoverySources(workspaceCode: string): Promise<
  Array<{
    candidateType: string;
    sourceUrl: string;
    sourceType: string;
    discoveryMethod: string;
    preliminaryConfidence: number;
    governanceState: string;
    reviewStatus: string;
    workspaceRelevance: string;
    geoHints: string[];
    languageHints: string[];
    riskLevel: string;
    eligibility: string;
    firstSeenAt: string;
  }>
> {
  try {
    const result = await dbPool.query<{
      candidate_type: string;
      source_url: string;
      source_type: string;
      discovery_method: string;
      preliminary_confidence: number;
      governance_state: string;
      review_status: string;
      workspace_relevance: string;
      geo_hints: string[];
      language_hints: string[];
      risk_level: string;
      eligibility: string;
      first_seen_at: string;
    }>(
      `
      SELECT
        ds.candidate_type,
        ds.source_url,
        ds.source_type,
        ds.discovery_method,
        ds.preliminary_confidence,
        ds.governance_state,
        ds.review_status,
        ds.workspace_relevance,
        ds.geo_hints,
        ds.language_hints,
        ds.risk_level,
        ds.eligibility,
        ds.first_seen_at::text
      FROM discovery_sources ds
      JOIN workspaces w ON w.id = ds.workspace_id
      WHERE w.code = $1
      ORDER BY ds.first_seen_at DESC
      LIMIT 50
      `,
      [workspaceCode],
    );
    return result.rows.map((row) => ({
      candidateType: row.candidate_type,
      sourceUrl: row.source_url,
      sourceType: row.source_type,
      discoveryMethod: row.discovery_method,
      preliminaryConfidence: row.preliminary_confidence,
      governanceState: row.governance_state,
      reviewStatus: row.review_status,
      workspaceRelevance: row.workspace_relevance,
      geoHints: row.geo_hints,
      languageHints: row.language_hints,
      riskLevel: row.risk_level,
      eligibility: row.eligibility,
      firstSeenAt: row.first_seen_at,
    }));
  } catch {
    return [
      {
        candidateType: "source_candidate",
        sourceUrl: "https://example-manufacturing.vn",
        sourceType: "company-website",
        discoveryMethod: "seed_domain",
        preliminaryConfidence: 78,
        governanceState: "allowed_with_limits",
        reviewStatus: "none",
        workspaceRelevance: "high",
        geoHints: ["VN"],
        languageHints: ["vi", "en"],
        riskLevel: "low",
        eligibility: "allow_limited",
        firstSeenAt: "2026-03-28T02:00:00.000Z",
      },
      {
        candidateType: "source_candidate",
        sourceUrl: "https://jobs.example-growth.com",
        sourceType: "job-board-public",
        discoveryMethod: "search_expansion",
        preliminaryConfidence: 61,
        governanceState: "review_required",
        reviewStatus: "pending",
        workspaceRelevance: "medium",
        geoHints: ["VN"],
        languageHints: ["vi", "en"],
        riskLevel: "medium",
        eligibility: "manual_review",
        firstSeenAt: "2026-03-28T05:30:00.000Z",
      },
    ];
  }
}

export async function getGovernanceDecisions(workspaceCode: string): Promise<
  Array<{
    domain: string;
    decision: string;
    sourceGovernanceState: string;
    reason: string;
    actor: string;
    legalRiskLevel: string;
    complianceClass: string;
    at: string;
  }>
> {
  try {
    const result = await dbPool.query<{
      domain: string;
      decision: string;
      source_governance_state: string;
      reason: string;
      actor: string;
      legal_risk_level: string;
      compliance_class: string;
      decided_at: string;
    }>(
      `
      SELECT
        cgd.domain,
        cgd.decision,
        cgd.source_governance_state,
        cgd.reason,
        cgd.actor,
        cgd.legal_risk_level,
        cgd.compliance_class,
        cgd.decided_at::text
      FROM crawl_governance_decisions cgd
      JOIN workspaces w ON w.id = cgd.workspace_id
      WHERE w.code = $1
      ORDER BY cgd.decided_at DESC
      LIMIT 50
      `,
      [workspaceCode],
    );
    return result.rows.map((row) => ({
      domain: row.domain,
      decision: row.decision,
      sourceGovernanceState: row.source_governance_state,
      reason: row.reason,
      actor: row.actor,
      legalRiskLevel: row.legal_risk_level,
      complianceClass: row.compliance_class,
      at: row.decided_at,
    }));
  } catch {
    return [
      {
        domain: "example-manufacturing.vn",
        decision: "allow_limited",
        sourceGovernanceState: "allowed_with_limits",
        reason: "robots_ok_with_delay",
        actor: "crawl-governance-engine",
        legalRiskLevel: "low",
        complianceClass: "restricted",
        at: "2026-03-29T00:40:00.000Z",
      },
      {
        domain: "jobs.example-growth.com",
        decision: "manual_review",
        sourceGovernanceState: "review_required",
        reason: "unclear_policy_signals",
        actor: "crawl-governance-engine",
        legalRiskLevel: "medium",
        complianceClass: "restricted",
        at: "2026-03-29T01:20:00.000Z",
      },
    ];
  }
}
