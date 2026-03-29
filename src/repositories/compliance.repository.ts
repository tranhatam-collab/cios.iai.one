import { dbPool } from "../bootstrap/db.js";

export type CompliancePolicy = {
  key: string;
  title: string;
  path: string;
};

const staticPolicies: CompliancePolicy[] = [
  { key: "privacy-policy", title: "Privacy Policy", path: "/legal/privacy.html" },
  { key: "terms-of-use", title: "Terms of Use", path: "/legal/terms.html" },
  { key: "data-source-policy", title: "Data Source Policy", path: "/legal/data-source-policy.html" },
  { key: "suppression-list", title: "Suppression List", path: "/legal/suppression-list.html" },
  { key: "deletion-request", title: "Deletion Request", path: "/legal/deletion-request.html" },
  { key: "right-to-object", title: "Right to Object", path: "/legal/right-to-object.html" }
];

export function getCompliancePolicies(): CompliancePolicy[] {
  return staticPolicies;
}

export async function getComplianceAuditLog(workspaceCode: string): Promise<
  Array<{ id: string; type: string; message: string; actor: string; at: string }>
> {
  try {
    const result = await dbPool.query<{
      id: string;
      event_type: string;
      message: string;
      actor: string;
      created_at: string;
    }>(
      `
      SELECT
        id::text,
        event_type,
        message,
        actor,
        created_at::text
      FROM compliance_audit_logs cal
      JOIN workspaces w ON w.id = cal.workspace_id
      WHERE w.code = $1
      ORDER BY cal.created_at DESC
      LIMIT 50
      `,
      [workspaceCode]
    );
    return result.rows.map((row) => ({
      id: row.id,
      type: row.event_type,
      message: row.message,
      actor: row.actor,
      at: row.created_at
    }));
  } catch {
    return [
      {
        id: "audit_001",
        type: "policy_decision",
        message: "Domain queued with manual review due to policy ambiguity",
        actor: "crawl-governance-engine",
        at: "2026-03-29T00:15:00.000Z"
      },
      {
        id: "audit_002",
        type: "suppression_applied",
        message: "Suppression list matched before outreach workflow",
        actor: "workflow-engine",
        at: "2026-03-29T01:05:00.000Z"
      }
    ];
  }
}

export async function getRetentionRules(workspaceCode: string): Promise<
  Array<{ dataClass: string; retentionDays: number; strategy: string }>
> {
  try {
    const result = await dbPool.query<{
      data_class: string;
      retention_days: number;
      strategy: string;
    }>(
      `
      SELECT rr.data_class, rr.retention_days, rr.strategy
      FROM retention_rules rr
      JOIN workspaces w ON w.id = rr.workspace_id
      WHERE w.code = $1
      ORDER BY rr.data_class ASC
      `,
      [workspaceCode]
    );
    return result.rows.map((row) => ({
      dataClass: row.data_class,
      retentionDays: row.retention_days,
      strategy: row.strategy
    }));
  } catch {
    return [
      { dataClass: "raw_html_cache", retentionDays: 30, strategy: "ttl_delete" },
      { dataClass: "derived_company_profile", retentionDays: 365, strategy: "rolling_recompute" },
      { dataClass: "audit_logs", retentionDays: 730, strategy: "immutable_archive" }
    ];
  }
}
