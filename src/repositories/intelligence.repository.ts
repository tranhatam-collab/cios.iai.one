import { scoreCompany, detectSignals, assessRisk, recommendAction } from "../integrations/aiagent.js";
import { dbPool } from "../bootstrap/db.js";
import type { OrganizationSummary } from "./crm.repository.js";

export interface CompanyScore {
  fitScore: number;
  timingScore: number;
  riskScore: number;
  overallScore: number;
  reasoning: string;
}

export interface Signal {
  type: string;
  title: string;
  summary: string;
  confidence: number;
  impact: string;
}

export interface RiskCheck {
  riskLevel: "low" | "medium" | "high";
  safeToAct: boolean;
  flags: string[];
  summary: string;
}

export interface RecommendedAction {
  actionType: string;
  title: string;
  body: string;
  priority: "low" | "medium" | "high" | "urgent";
}

export async function enrichOrganization(
  workspaceCode: string,
  org: OrganizationSummary,
): Promise<{
  score: CompanyScore;
  signals: Signal[];
  risk: RiskCheck;
  action: RecommendedAction;
}> {
  // 1. Fetch existing signals from discovery_sources
  const signalRows = await dbPool.query<{
    source_type: string;
    source_url: string;
    preliminary_confidence: number;
    risk_level: string;
  }>(
    `
    SELECT source_type, source_url, preliminary_confidence, risk_level
    FROM discovery_sources ds
    JOIN workspaces w ON w.id = ds.workspace_id
    WHERE w.code = $1
      AND (ds.source_url ILIKE ('%' || $2 || '%'))
    ORDER BY ds.first_seen_at DESC
    LIMIT 10
    `,
    [workspaceCode, org.domain],
  );

  const existingSignals: Signal[] = signalRows.rows.map((r) => ({
    type: r.source_type,
    title: `${r.source_type} signal`,
    summary: `Detected from ${r.source_url}`,
    confidence: r.preliminary_confidence,
    impact: r.risk_level === "low" ? "medium" : "low",
  }));

  // 2. AI scoring (with fallback)
  const score = await scoreCompany({
    name: org.name,
    domain: org.domain,
    industry: org.industry,
    signals: existingSignals.map((s) => ({
      type: s.type,
      summary: s.summary,
      confidence: s.confidence,
    })),
  });

  // 3. AI risk assessment (with fallback)
  const risk = await assessRisk({
    name: org.name,
    domain: org.domain,
  });

  // 4. AI action recommendation (with fallback)
  const action = await recommendAction({
    name: org.name,
    overallScore: score.overallScore,
    riskLevel: risk.riskLevel,
    signalsCount: existingSignals.length,
  });

  return { score, signals: existingSignals, risk, action };
}

export async function analyzeCompanyWebsite(params: {
  workspaceCode: string;
  companyName: string;
  domain: string;
  websiteText: string;
}): Promise<{
  signals: Signal[];
  score: CompanyScore;
  risk: RiskCheck;
  action: RecommendedAction;
}> {
  const signals = await detectSignals({
    companyName: params.companyName,
    rawText: params.websiteText,
  });

  const score = await scoreCompany({
    name: params.companyName,
    domain: params.domain,
    industry: "Unknown",
    signals: signals.map((s) => ({
      type: s.type,
      summary: s.summary,
      confidence: s.confidence,
    })),
  });

  const risk = await assessRisk({
    name: params.companyName,
    domain: params.domain,
  });

  const action = await recommendAction({
    name: params.companyName,
    overallScore: score.overallScore,
    riskLevel: risk.riskLevel,
    signalsCount: signals.length,
  });

  return { signals, score, risk, action };
}
