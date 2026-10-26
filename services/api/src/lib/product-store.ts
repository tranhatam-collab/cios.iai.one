import { ensurePersistenceSchema, type WorkerEnv } from "./persistence";

export type OrganizationRow = {
  id: string;
  name: string;
  domain: string;
  industry: string;
  fitScore: number;
  intentScore: number;
  stage: "new" | "qualified" | "proposal";
  owner: string;
};

export type DiscoverySourceRow = {
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
};

const SEED_ORGS: OrganizationRow[] = [
  {
    id: "org_iai_logistics",
    name: "IAI Logistics",
    domain: "iai-logistics.vn",
    industry: "Logistics",
    fitScore: 82,
    intentScore: 64,
    stage: "qualified",
    owner: "sales-a"
  },
  {
    id: "org_sao_biotech",
    name: "Sao Biotech",
    domain: "saobiotech.com",
    industry: "Biotech",
    fitScore: 75,
    intentScore: 51,
    stage: "new",
    owner: "sales-b"
  },
  {
    id: "org_tam_commerce",
    name: "Tam Commerce",
    domain: "tamcommerce.vn",
    industry: "Ecommerce Enablement",
    fitScore: 91,
    intentScore: 78,
    stage: "proposal",
    owner: "sales-a"
  }
];

const SEED_SOURCES: DiscoverySourceRow[] = [
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
    firstSeenAt: "2026-03-28T02:00:00.000Z"
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
    languageHints: ["en"],
    riskLevel: "medium",
    eligibility: "review",
    firstSeenAt: "2026-03-29T08:00:00.000Z"
  }
];

function seedId(workspaceCode: string, localId: string): string {
  return `${workspaceCode}__${localId}`;
}

async function seedProductData(env: WorkerEnv, workspaceCode: string): Promise<void> {
  if (!env.CIOS_DB) return;
  await ensurePersistenceSchema(env);
  const orgCount = await env.CIOS_DB.prepare(
    "SELECT COUNT(*) AS c FROM api_organizations WHERE workspace_code = ?"
  )
    .bind(workspaceCode)
    .first<{ c: number }>();
  if (!orgCount || Number(orgCount.c) === 0) {
    const now = new Date().toISOString();
    for (const org of SEED_ORGS) {
      await env.CIOS_DB.prepare(
        `
        INSERT OR IGNORE INTO api_organizations
          (id, workspace_code, name, domain, industry, fit_score, intent_score, stage, owner, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
        .bind(
          seedId(workspaceCode, org.id),
          workspaceCode,
          org.name,
          org.domain,
          org.industry,
          org.fitScore,
          org.intentScore,
          org.stage,
          org.owner,
          now
        )
        .run();
    }
  }

  const srcCount = await env.CIOS_DB.prepare(
    "SELECT COUNT(*) AS c FROM api_discovery_sources WHERE workspace_code = ?"
  )
    .bind(workspaceCode)
    .first<{ c: number }>();
  if (!srcCount || Number(srcCount.c) === 0) {
    let i = 0;
    for (const src of SEED_SOURCES) {
      i += 1;
      await env.CIOS_DB.prepare(
        `
        INSERT OR IGNORE INTO api_discovery_sources
          (id, workspace_code, candidate_type, source_url, source_type, discovery_method,
           preliminary_confidence, governance_state, review_status, workspace_relevance,
           geo_hints_json, language_hints_json, risk_level, eligibility, first_seen_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
        .bind(
          seedId(workspaceCode, `src_seed_${i}`),
          workspaceCode,
          src.candidateType,
          src.sourceUrl,
          src.sourceType,
          src.discoveryMethod,
          src.preliminaryConfidence,
          src.governanceState,
          src.reviewStatus,
          src.workspaceRelevance,
          JSON.stringify(src.geoHints),
          JSON.stringify(src.languageHints),
          src.riskLevel,
          src.eligibility,
          src.firstSeenAt
        )
        .run();
    }
  }

  const auditCount = await env.CIOS_DB.prepare(
    "SELECT COUNT(*) AS c FROM api_compliance_audit WHERE workspace_code = ?"
  )
    .bind(workspaceCode)
    .first<{ c: number }>();
  if (!auditCount || Number(auditCount.c) === 0) {
    await env.CIOS_DB.prepare(
      `
      INSERT OR IGNORE INTO api_compliance_audit
        (id, workspace_code, action, actor, result, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        seedId(workspaceCode, "audit_seed_1"),
        workspaceCode,
        "policy_evaluate",
        "system",
        "allow",
        JSON.stringify({ note: "seed" }),
        new Date().toISOString()
      )
      .run();
  }

  const reviewCount = await env.CIOS_DB.prepare(
    "SELECT COUNT(*) AS c FROM api_review_queue WHERE workspace_code = ?"
  )
    .bind(workspaceCode)
    .first<{ c: number }>();
  if (!reviewCount || Number(reviewCount.c) === 0) {
    await env.CIOS_DB.prepare(
      `
      INSERT OR IGNORE INTO api_review_queue
        (id, workspace_code, title, status, priority, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        seedId(workspaceCode, "rev_seed_1"),
        workspaceCode,
        "Review new source candidate",
        "pending",
        "medium",
        new Date().toISOString()
      )
      .run();
  }

  const govCount = await env.CIOS_DB.prepare(
    "SELECT COUNT(*) AS c FROM api_crawl_governance WHERE workspace_code = ?"
  )
    .bind(workspaceCode)
    .first<{ c: number }>();
  if (!govCount || Number(govCount.c) === 0) {
    await env.CIOS_DB.prepare(
      `
      INSERT OR IGNORE INTO api_crawl_governance
        (id, workspace_code, decision, source_url, reason, decided_at)
      VALUES (?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        seedId(workspaceCode, "gov_seed_1"),
        workspaceCode,
        "allow_limited",
        "https://example-manufacturing.vn",
        "Public company site within policy",
        new Date().toISOString()
      )
      .run();
  }
}

export async function listOrganizations(
  env: WorkerEnv,
  workspaceCode: string,
  search?: string | null
): Promise<{ rows: OrganizationRow[]; source: "d1" | "seed" }> {
  if (env.CIOS_DB) {
    await seedProductData(env, workspaceCode);
    const like = search ? `%${search.toLowerCase()}%` : null;
    const rows = like
      ? await env.CIOS_DB.prepare(
          `
          SELECT id, name, domain, industry, fit_score, intent_score, stage, owner
          FROM api_organizations
          WHERE workspace_code = ?
            AND (
              lower(name) LIKE ? OR lower(domain) LIKE ? OR lower(industry) LIKE ?
            )
          ORDER BY created_at DESC
          LIMIT 100
          `
        )
          .bind(workspaceCode, like, like, like)
          .all<{
            id: string;
            name: string;
            domain: string;
            industry: string;
            fit_score: number;
            intent_score: number;
            stage: "new" | "qualified" | "proposal";
            owner: string;
          }>()
      : await env.CIOS_DB.prepare(
          `
          SELECT id, name, domain, industry, fit_score, intent_score, stage, owner
          FROM api_organizations
          WHERE workspace_code = ?
          ORDER BY created_at DESC
          LIMIT 100
          `
        )
          .bind(workspaceCode)
          .all<{
            id: string;
            name: string;
            domain: string;
            industry: string;
            fit_score: number;
            intent_score: number;
            stage: "new" | "qualified" | "proposal";
            owner: string;
          }>();

    return {
      source: "d1",
      rows: (rows.results ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        domain: row.domain,
        industry: row.industry,
        fitScore: row.fit_score,
        intentScore: row.intent_score,
        stage: row.stage,
        owner: row.owner
      }))
    };
  }

  const filtered = !search
    ? SEED_ORGS
    : SEED_ORGS.filter((item) => {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.domain.toLowerCase().includes(q) ||
          item.industry.toLowerCase().includes(q)
        );
      });
  return { source: "seed", rows: filtered };
}

export async function getOrganization(
  env: WorkerEnv,
  workspaceCode: string,
  id: string
): Promise<(OrganizationRow & { nextActions: string[]; lineage: { sourceCount: number; lastEnrichedAt: string } }) | null> {
  const { rows } = await listOrganizations(env, workspaceCode);
  const found = rows.find((item) => item.id === id);
  if (!found) return null;
  return {
    ...found,
    nextActions: ["review_fit", "enrich_signals"],
    lineage: { sourceCount: 2, lastEnrichedAt: "2026-03-30T00:00:00.000Z" }
  };
}

export async function listDiscoverySources(
  env: WorkerEnv,
  workspaceCode: string
): Promise<{ rows: DiscoverySourceRow[]; source: "d1" | "seed" }> {
  if (env.CIOS_DB) {
    await seedProductData(env, workspaceCode);
    const rows = await env.CIOS_DB.prepare(
      `
      SELECT * FROM api_discovery_sources
      WHERE workspace_code = ?
      ORDER BY first_seen_at DESC
      LIMIT 50
      `
    )
      .bind(workspaceCode)
      .all<{
        candidate_type: string;
        source_url: string;
        source_type: string;
        discovery_method: string;
        preliminary_confidence: number;
        governance_state: string;
        review_status: string;
        workspace_relevance: string;
        geo_hints_json: string;
        language_hints_json: string;
        risk_level: string;
        eligibility: string;
        first_seen_at: string;
      }>();
    return {
      source: "d1",
      rows: (rows.results ?? []).map((row) => ({
        candidateType: row.candidate_type,
        sourceUrl: row.source_url,
        sourceType: row.source_type,
        discoveryMethod: row.discovery_method,
        preliminaryConfidence: row.preliminary_confidence,
        governanceState: row.governance_state,
        reviewStatus: row.review_status,
        workspaceRelevance: row.workspace_relevance,
        geoHints: JSON.parse(row.geo_hints_json || "[]") as string[],
        languageHints: JSON.parse(row.language_hints_json || "[]") as string[],
        riskLevel: row.risk_level,
        eligibility: row.eligibility,
        firstSeenAt: row.first_seen_at
      }))
    };
  }
  return { source: "seed", rows: SEED_SOURCES };
}

export async function listCrawlGovernance(env: WorkerEnv, workspaceCode: string) {
  if (env.CIOS_DB) {
    await seedProductData(env, workspaceCode);
    const rows = await env.CIOS_DB.prepare(
      `
      SELECT id, decision, source_url, reason, decided_at
      FROM api_crawl_governance WHERE workspace_code = ?
      ORDER BY decided_at DESC LIMIT 50
      `
    )
      .bind(workspaceCode)
      .all<{
        id: string;
        decision: string;
        source_url: string;
        reason: string;
        decided_at: string;
      }>();
    return {
      source: "d1" as const,
      rows: (rows.results ?? []).map((r) => ({
        id: r.id,
        decision: r.decision,
        sourceUrl: r.source_url,
        reason: r.reason,
        decidedAt: r.decided_at
      }))
    };
  }
  return {
    source: "seed" as const,
    rows: [
      {
        id: "gov_seed_1",
        decision: "allow_limited",
        sourceUrl: "https://example-manufacturing.vn",
        reason: "Public company site within policy",
        decidedAt: "2026-03-28T02:00:00.000Z"
      }
    ]
  };
}

export async function listReviewQueue(env: WorkerEnv, workspaceCode: string) {
  if (env.CIOS_DB) {
    await seedProductData(env, workspaceCode);
    const rows = await env.CIOS_DB.prepare(
      `
      SELECT id, title, status, priority, created_at
      FROM api_review_queue WHERE workspace_code = ?
      ORDER BY created_at DESC LIMIT 50
      `
    )
      .bind(workspaceCode)
      .all<{ id: string; title: string; status: string; priority: string; created_at: string }>();
    return {
      source: "d1" as const,
      rows: (rows.results ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        priority: r.priority,
        createdAt: r.created_at
      }))
    };
  }
  return {
    source: "seed" as const,
    rows: [
      {
        id: "rev_seed_1",
        title: "Review new source candidate",
        status: "pending",
        priority: "medium",
        createdAt: "2026-03-29T08:00:00.000Z"
      }
    ]
  };
}

export async function listComplianceAudit(env: WorkerEnv, workspaceCode: string) {
  if (env.CIOS_DB) {
    await seedProductData(env, workspaceCode);
    const rows = await env.CIOS_DB.prepare(
      `
      SELECT id, action, actor, result, details_json, created_at
      FROM api_compliance_audit WHERE workspace_code = ?
      ORDER BY created_at DESC LIMIT 50
      `
    )
      .bind(workspaceCode)
      .all<{
        id: string;
        action: string;
        actor: string;
        result: string;
        details_json: string | null;
        created_at: string;
      }>();
    return {
      source: "d1" as const,
      rows: (rows.results ?? []).map((r) => ({
        id: r.id,
        action: r.action,
        actor: r.actor,
        result: r.result,
        details: r.details_json ? JSON.parse(r.details_json) : null,
        createdAt: r.created_at
      }))
    };
  }
  return {
    source: "seed" as const,
    rows: [
      {
        id: "audit_seed_1",
        action: "policy_evaluate",
        actor: "system",
        result: "allow",
        details: { note: "seed" },
        createdAt: "2026-03-28T02:00:00.000Z"
      }
    ]
  };
}

export async function buildBootstrap(env: WorkerEnv, claims: Record<string, unknown>) {
  const workspaceCode = String(claims.workspaceCode ?? "demo");
  return {
    user: {
      userId: String(claims.userId ?? claims.sub ?? "unknown"),
      email: String(claims.email ?? "unknown@iai.one"),
      displayName: String(claims.name ?? "Member"),
      role: String(claims.role ?? "observer")
    },
    workspace: {
      workspaceId: String(claims.workspaceId ?? "ws_demo"),
      workspaceCode,
      plan: String(claims.plan ?? "starter")
    },
    permissions: ["crm.read", "discovery.read", "compliance.read", "review.read"],
    modules: ["accounts", "signals", "priorities", "audit", "settings"],
    nav: [
      { id: "dashboard", href: "/app/", label: "Dashboard" },
      { id: "accounts", href: "/app/accounts/", label: "Accounts" },
      { id: "signals", href: "/app/signals/", label: "Signals" }
    ],
    context: {
      apiContract: env.API_CONTRACT ?? "phase2-workers-v1",
      constitutionalMode: true
    }
  };
}

export async function buildOverview(env: WorkerEnv, workspaceCode: string) {
  const orgs = await listOrganizations(env, workspaceCode);
  const sources = await listDiscoverySources(env, workspaceCode);
  const reviews = await listReviewQueue(env, workspaceCode);
  return {
    topOrganizations: orgs.rows.slice(0, 5),
    discoveryCount: sources.rows.length,
    pendingReviews: reviews.rows.filter((r) => r.status === "pending").length,
    workflowHealth: "connecting",
    source: orgs.source
  };
}
