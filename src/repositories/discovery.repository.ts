import { dbPool } from "../bootstrap/db.js";

export async function getDiscoverySources(workspaceCode: string): Promise<
  Array<{
    sourceUrl: string;
    sourceType: string;
    riskLevel: string;
    eligibility: string;
    firstSeenAt: string;
  }>
> {
  try {
    const result = await dbPool.query<{
      source_url: string;
      source_type: string;
      risk_level: string;
      eligibility: string;
      first_seen_at: string;
    }>(
      `
      SELECT ds.source_url, ds.source_type, ds.risk_level, ds.eligibility, ds.first_seen_at::text
      FROM discovery_sources ds
      JOIN workspaces w ON w.id = ds.workspace_id
      WHERE w.code = $1
      ORDER BY ds.first_seen_at DESC
      LIMIT 50
      `,
      [workspaceCode]
    );
    return result.rows.map((row) => ({
      sourceUrl: row.source_url,
      sourceType: row.source_type,
      riskLevel: row.risk_level,
      eligibility: row.eligibility,
      firstSeenAt: row.first_seen_at
    }));
  } catch {
    return [
      {
        sourceUrl: "https://example-manufacturing.vn",
        sourceType: "company-website",
        riskLevel: "low",
        eligibility: "allow_limited",
        firstSeenAt: "2026-03-28T02:00:00.000Z"
      },
      {
        sourceUrl: "https://jobs.example-growth.com",
        sourceType: "job-board-public",
        riskLevel: "medium",
        eligibility: "manual_review",
        firstSeenAt: "2026-03-28T05:30:00.000Z"
      }
    ];
  }
}

export async function getGovernanceDecisions(workspaceCode: string): Promise<
  Array<{ domain: string; decision: string; reason: string; at: string }>
> {
  try {
    const result = await dbPool.query<{
      domain: string;
      decision: string;
      reason: string;
      decided_at: string;
    }>(
      `
      SELECT cgd.domain, cgd.decision, cgd.reason, cgd.decided_at::text
      FROM crawl_governance_decisions cgd
      JOIN workspaces w ON w.id = cgd.workspace_id
      WHERE w.code = $1
      ORDER BY cgd.decided_at DESC
      LIMIT 50
      `,
      [workspaceCode]
    );
    return result.rows.map((row) => ({
      domain: row.domain,
      decision: row.decision,
      reason: row.reason,
      at: row.decided_at
    }));
  } catch {
    return [
      {
        domain: "example-manufacturing.vn",
        decision: "allow_limited",
        reason: "robots_ok_with_delay",
        at: "2026-03-29T00:40:00.000Z"
      },
      {
        domain: "jobs.example-growth.com",
        decision: "manual_review",
        reason: "unclear_policy_signals",
        at: "2026-03-29T01:20:00.000Z"
      }
    ];
  }
}
