import { dbPool } from "../bootstrap/db.js";

export type OrganizationSummary = {
  id: string;
  name: string;
  domain: string;
  industry: string;
  fitScore: number;
  intentScore: number;
  stage: "new" | "qualified" | "proposal";
  owner: string;
};

export type OrganizationListPage = {
  items: OrganizationSummary[];
  total: number;
  page: number;
  pageSize: number;
};

const fallbackOrganizations: OrganizationSummary[] = [
  {
    id: "org_iai_logistics",
    name: "IAI Logistics",
    domain: "iai-logistics.vn",
    industry: "Logistics",
    fitScore: 82,
    intentScore: 64,
    stage: "qualified",
    owner: "sales-a",
  },
  {
    id: "org_sao_biotech",
    name: "Sao Biotech",
    domain: "saobiotech.com",
    industry: "Biotech",
    fitScore: 75,
    intentScore: 51,
    stage: "new",
    owner: "sales-b",
  },
  {
    id: "org_tam_commerce",
    name: "Tam Commerce",
    domain: "tamcommerce.vn",
    industry: "Ecommerce Enablement",
    fitScore: 91,
    intentScore: 78,
    stage: "proposal",
    owner: "sales-a",
  },
];

export async function listOrganizations(params: {
  workspaceCode: string;
  search?: string;
}): Promise<OrganizationSummary[]> {
  try {
    const result = await dbPool.query<{
      id: string;
      name: string;
      domain: string;
      industry: string;
      fit_score: number;
      intent_score: number;
      stage: "new" | "qualified" | "proposal";
      owner: string;
    }>(
      `
      SELECT
        o.id::text,
        o.name,
        o.domain,
        COALESCE(o.industry, 'Unknown') AS industry,
        COALESCE(o.fit_score, 0) AS fit_score,
        COALESCE(o.intent_score, 0) AS intent_score,
        COALESCE(o.stage, 'new') AS stage,
        COALESCE(owner_user.display_name, 'unassigned') AS owner
      FROM organizations o
      JOIN workspaces w ON w.id = o.workspace_id
      LEFT JOIN workspace_members wm ON wm.id = o.owner_member_id
      LEFT JOIN users owner_user ON owner_user.id = wm.user_id
      WHERE w.code = $1
        AND (
          $2::text IS NULL OR
          o.name ILIKE ('%' || $2::text || '%') OR
          o.domain ILIKE ('%' || $2::text || '%') OR
          COALESCE(o.industry, '') ILIKE ('%' || $2::text || '%')
        )
      ORDER BY o.created_at DESC
      LIMIT 100
      `,
      [params.workspaceCode, params.search ?? null],
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      domain: row.domain,
      industry: row.industry,
      fitScore: row.fit_score,
      intentScore: row.intent_score,
      stage: row.stage,
      owner: row.owner,
    }));
  } catch {
    if (!params.search) {
      return fallbackOrganizations;
    }
    const search = params.search.toLowerCase();
    return fallbackOrganizations.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.domain.toLowerCase().includes(search) ||
        item.industry.toLowerCase().includes(search),
    );
  }
}

export async function listOrganizationsPaginated(params: {
  workspaceCode: string;
  search?: string;
  page: number;
  pageSize: number;
}): Promise<OrganizationListPage> {
  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const offset = (page - 1) * pageSize;

  try {
    const countResult = await dbPool.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM organizations o
      JOIN workspaces w ON w.id = o.workspace_id
      WHERE w.code = $1
        AND (
          $2::text IS NULL OR
          o.name ILIKE ('%' || $2::text || '%') OR
          o.domain ILIKE ('%' || $2::text || '%') OR
          COALESCE(o.industry, '') ILIKE ('%' || $2::text || '%')
        )
      `,
      [params.workspaceCode, params.search ?? null],
    );

    const listResult = await dbPool.query<{
      id: string;
      name: string;
      domain: string;
      industry: string;
      fit_score: number;
      intent_score: number;
      stage: "new" | "qualified" | "proposal";
      owner: string;
    }>(
      `
      SELECT
        o.id::text,
        o.name,
        o.domain,
        COALESCE(o.industry, 'Unknown') AS industry,
        COALESCE(o.fit_score, 0) AS fit_score,
        COALESCE(o.intent_score, 0) AS intent_score,
        COALESCE(o.stage, 'new') AS stage,
        COALESCE(owner_user.display_name, 'unassigned') AS owner
      FROM organizations o
      JOIN workspaces w ON w.id = o.workspace_id
      LEFT JOIN workspace_members wm ON wm.id = o.owner_member_id
      LEFT JOIN users owner_user ON owner_user.id = wm.user_id
      WHERE w.code = $1
        AND (
          $2::text IS NULL OR
          o.name ILIKE ('%' || $2::text || '%') OR
          o.domain ILIKE ('%' || $2::text || '%') OR
          COALESCE(o.industry, '') ILIKE ('%' || $2::text || '%')
        )
      ORDER BY o.created_at DESC
      OFFSET $3
      LIMIT $4
      `,
      [params.workspaceCode, params.search ?? null, offset, pageSize],
    );

    return {
      items: listResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        domain: row.domain,
        industry: row.industry,
        fitScore: row.fit_score,
        intentScore: row.intent_score,
        stage: row.stage,
        owner: row.owner,
      })),
      total: countResult.rows[0]?.total ?? 0,
      page,
      pageSize,
    };
  } catch {
    const all = await listOrganizations({
      workspaceCode: params.workspaceCode,
      search: params.search,
    });
    return {
      items: all.slice(offset, offset + pageSize),
      total: all.length,
      page,
      pageSize,
    };
  }
}

export async function getOrganizationById(params: {
  workspaceCode: string;
  id: string;
}): Promise<
  | (OrganizationSummary & {
      nextActions: string[];
      lineage: { sourceCount: number; lastEnrichedAt: string };
    })
  | null
> {
  const rows = await listOrganizations({ workspaceCode: params.workspaceCode });
  const found = rows.find((item) => item.id === params.id);
  if (!found) {
    return null;
  }
  return {
    ...found,
    nextActions: [
      "Verify public contact points and enrichment confidence",
      "Run compliance score check before outreach",
      "Trigger personalized outbound draft for owner review",
    ],
    lineage: {
      sourceCount: 5,
      lastEnrichedAt: "2026-03-28T09:30:00.000Z",
    },
  };
}
