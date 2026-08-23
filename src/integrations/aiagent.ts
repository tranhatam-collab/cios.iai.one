import { env } from "../bootstrap/env.js";
import { logger } from "../bootstrap/logger.js";

const AIAGENT_BASE = env.AIAGENT_API_URL.replace(/\/$/, "");

export interface AiAgentRequest {
  messages: Array<{ role: string; content: string }>;
  model_preference?: string;
  language?: string;
  metadata?: { surface?: string; feature?: string };
}

export interface AiAgentReceipt {
  run_id?: string;
  tenant_id?: string;
  model?: string;
  content?: string;
  receipt?: {
    gateway_run_id?: string;
    tenant_id?: string;
    model?: string;
    usage?: { cost_usd?: number | null; authoritative?: boolean };
  };
}

export interface AiAgentResponse {
  ok: boolean;
  output?: string;
  data?: unknown;
  receipt?: AiAgentReceipt;
  error?: { code: string; message: string };
  fallback?: boolean;
}

async function aiAgentFetch(
  path: string,
  body: unknown,
): Promise<AiAgentResponse> {
  if (!env.AIAGENT_API_KEY) {
    return {
      ok: false,
      error: { code: "NO_API_KEY", message: "AIAGENT_API_KEY not configured" },
    };
  }

  try {
    const res = await fetch(`${AIAGENT_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AIAGENT_API_KEY}`,
        "X-Tenant-Id": "cios-iai",
        "X-Client-Contract": "cios-ai-gateway/1.0",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn({ status: res.status, text }, "aiagent error response");
      return {
        ok: false,
        error: { code: `HTTP_${res.status}`, message: text || res.statusText },
      };
    }

    const data = (await res.json()) as Record<string, unknown>;
    // Gateway returns { content, run_id, tenant_id, model, receipt } per chat contract
    const content = (data.content as string) || (data.output as string) || "";
    const receipt: AiAgentReceipt = {
      run_id: data.run_id as string | undefined,
      tenant_id: data.tenant_id as string | undefined,
      model: data.model as string | undefined,
      receipt: data.receipt as AiAgentReceipt["receipt"],
    };
    // Validate tenant isolation: gateway must return cios-iai
    if (receipt.tenant_id && receipt.tenant_id !== "cios-iai") {
      logger.error(
        { expected: "cios-iai", got: receipt.tenant_id },
        "aiagent tenant mismatch — possible cross-tenant leak",
      );
      return {
        ok: false,
        error: {
          code: "TENANT_MISMATCH",
          message: `Gateway returned tenant ${receipt.tenant_id}, expected cios-iai`,
        },
      };
    }
    // Validate run_id present (receipt-backed)
    if (!receipt.run_id) {
      logger.warn("aiagent response missing run_id — receipt not backed");
    }
    return { ok: true, output: content, data, receipt };
  } catch (err) {
    logger.error({ err }, "aiagent fetch failed");
    return {
      ok: false,
      error: { code: "FETCH_FAILED", message: String(err) },
    };
  }
}

/**
 * Ask AI to score a company based on known signals and attributes.
 * Returns structured JSON with fit_score, timing_score, risk_score, overall_score, reasoning.
 */
export async function scoreCompany(params: {
  name: string;
  domain: string;
  industry: string;
  signals: Array<{ type: string; summary: string; confidence: number }>;
}): Promise<{
  fitScore: number;
  timingScore: number;
  riskScore: number;
  overallScore: number;
  reasoning: string;
}> {
  const prompt = `Score this B2B account for sales outreach.
Company: ${params.name}
Domain: ${params.domain}
Industry: ${params.industry}
Signals:
${params.signals.map((s) => `- ${s.type}: ${s.summary} (confidence ${s.confidence}%)`).join("\n")}

Return ONLY valid JSON with keys: fit_score (0-100), timing_score (0-100), risk_score (0-100), overall_score (0-100), reasoning (string).`;

  const res = await aiAgentFetch("/v1/agent/chat", {
    messages: [{ role: "user", content: prompt }],
    model_preference: "iai-one/iris-7",
    language: "en",
    metadata: { surface: "cios", feature: "scoring" },
  });

  if (!res.ok || !res.output) {
    // Fallback rule-based scoring — explicitly labeled as non-AI
    const signalCount = params.signals.length;
    const avgConfidence =
      signalCount > 0
        ? params.signals.reduce((s, c) => s + c.confidence, 0) / signalCount
        : 50;
    const fitScore = Math.min(100, 40 + signalCount * 8 + avgConfidence * 0.2);
    const timingScore = Math.min(100, 30 + signalCount * 10);
    const riskScore = Math.min(100, 20 + (100 - avgConfidence) * 0.5);
    const overallScore = Math.round(
      fitScore * 0.4 + timingScore * 0.4 + avgConfidence * 0.2 - riskScore * 0.3,
    );
    return {
      fitScore: Math.round(fitScore),
      timingScore: Math.round(timingScore),
      riskScore: Math.round(riskScore),
      overallScore: Math.max(0, overallScore),
      reasoning: res.error
        ? `[FALLBACK:NON-AI] AI unavailable (${res.error.code}). Rule-based estimate.`
        : "[FALLBACK:NON-AI] Rule-based estimate.",
    };
  }

  try {
    const json = JSON.parse(
      res.output.replace(/```json\n?|\n?```/g, "").trim(),
    ) as {
      fit_score?: number;
      timing_score?: number;
      risk_score?: number;
      overall_score?: number;
      reasoning?: string;
    };
    return {
      fitScore: Math.min(100, Math.max(0, Math.round(json.fit_score ?? 50))),
      timingScore: Math.min(100, Math.max(0, Math.round(json.timing_score ?? 50))),
      riskScore: Math.min(100, Math.max(0, Math.round(json.risk_score ?? 50))),
      overallScore: Math.min(
        100,
        Math.max(0, Math.round(json.overall_score ?? 50)),
      ),
      reasoning: json.reasoning || "AI-generated score.",
    };
  } catch {
    return {
      fitScore: 50,
      timingScore: 50,
      riskScore: 50,
      overallScore: 50,
      reasoning: "AI response could not be parsed. Using neutral scores.",
    };
  }
}

/**
 * Ask AI to detect/enrich signals from raw text (website, news snippet, etc.)
 */
export async function detectSignals(params: {
  companyName: string;
  rawText: string;
}): Promise<
  Array<{
    type: string;
    title: string;
    summary: string;
    confidence: number;
    impact: string;
  }>
> {
  const prompt = `Analyze this text about "${params.companyName}" and extract business signals relevant for B2B sales.
Text: ${params.rawText.slice(0, 4000)}

Return ONLY a JSON array of objects with keys: type (hiring|funding|website_change|news_mention|product_launch|tech_change|leadership_change|expansion|risk), title, summary, confidence (0-100), impact (low|medium|high). Max 5 signals.`;

  const res = await aiAgentFetch("/v1/agent/chat", {
    messages: [{ role: "user", content: prompt }],
    model_preference: "iai-one/iris-7",
    language: "en",
    metadata: { surface: "cios", feature: "signal-detection" },
  });

  if (!res.ok || !res.output) {
    // Fallback: simple keyword extraction — explicitly labeled as non-AI
    const text = params.rawText.toLowerCase();
    const signals = [];
    if (text.includes("hiring") || text.includes("jobs"))
      signals.push({
        type: "hiring",
        title: "Hiring activity detected",
        summary: "Company appears to be expanding headcount.",
        confidence: 60,
        impact: "medium",
      });
    if (text.includes("product") || text.includes("launch"))
      signals.push({
        type: "product_launch",
        title: "Product activity",
        summary: "Mentions of new product or feature.",
        confidence: 55,
        impact: "medium",
      });
    if (text.includes("funding") || text.includes("raised"))
      signals.push({
        type: "funding",
        title: "Funding signal",
        summary: "Potential funding or investment mention.",
        confidence: 50,
        impact: "high",
      });
    return signals.length > 0
      ? signals
      : [
          {
            type: "other",
            title: "Generic mention",
            summary: "Company mentioned without clear buying signal.",
            confidence: 40,
            impact: "low",
          },
        ];
  }

  try {
    const parsed = JSON.parse(
      res.output.replace(/```json\n?|\n?```/g, "").trim(),
    ) as Array<{
      type: string;
      title: string;
      summary: string;
      confidence: number;
      impact: string;
    }>;
    return parsed.slice(0, 5).map((s) => ({
      type: s.type || "other",
      title: s.title || "Untitled signal",
      summary: s.summary || "",
      confidence: Math.min(100, Math.max(0, Math.round(s.confidence))),
      impact: ["low", "medium", "high"].includes(s.impact)
        ? s.impact
        : "low",
    }));
  } catch {
    return [
      {
        type: "other",
        title: "AI parse failed",
        summary: "Could not parse AI signal detection output.",
        confidence: 0,
        impact: "low",
      },
    ];
  }
}

/**
 * Ask AI to assess compliance/risk for a company.
 */
export async function assessRisk(params: {
  name: string;
  domain: string;
  country?: string;
  notes?: string;
}): Promise<{
  riskLevel: "low" | "medium" | "high";
  safeToAct: boolean;
  flags: string[];
  summary: string;
}> {
  const prompt = `Assess sales outreach risk for this company.
Name: ${params.name}
Domain: ${params.domain}
Country: ${params.country || "Unknown"}
Notes: ${params.notes || "None"}

Return ONLY valid JSON with keys: risk_level (low|medium|high), safe_to_act (boolean), flags (array of strings), summary (string).`;

  const res = await aiAgentFetch("/v1/agent/chat", {
    messages: [{ role: "user", content: prompt }],
    model_preference: "iai-one/iris-7",
    language: "en",
    metadata: { surface: "cios", feature: "risk-assessment" },
  });

  if (!res.ok || !res.output) {
    // Fallback rule-based risk — explicitly labeled as non-AI
    const flags = [];
    if (!params.country) flags.push("missing_geography");
    if ((params.notes || "").length < 10) flags.push("low_context");
    const riskLevel = flags.length >= 2 ? "medium" : "low";
    return {
      riskLevel,
      safeToAct: riskLevel === "low",
      flags,
      summary: res.error
        ? `[FALLBACK:NON-AI] AI unavailable (${res.error.code}). Rule-based fallback.`
        : "[FALLBACK:NON-AI] Rule-based risk estimate.",
    };
  }

  try {
    const json = JSON.parse(
      res.output.replace(/```json\n?|\n?```/g, "").trim(),
    ) as {
      risk_level?: string;
      safe_to_act?: boolean;
      flags?: string[];
      summary?: string;
    };
    const riskLevel = ["low", "medium", "high"].includes(
      json.risk_level || "",
    )
      ? (json.risk_level as "low" | "medium" | "high")
      : "medium";
    return {
      riskLevel,
      safeToAct: json.safe_to_act ?? riskLevel === "low",
      flags: Array.isArray(json.flags) ? json.flags : [],
      summary: json.summary || "AI risk assessment.",
    };
  } catch {
    return {
      riskLevel: "medium",
      safeToAct: false,
      flags: ["ai_parse_error"],
      summary: "Could not parse AI risk response. Default to review.",
    };
  }
}

/**
 * Ask AI to recommend next action based on score and risk.
 */
export async function recommendAction(params: {
  name: string;
  overallScore: number;
  riskLevel: string;
  signalsCount: number;
}): Promise<{
  actionType: string;
  title: string;
  body: string;
  priority: "low" | "medium" | "high" | "urgent";
}> {
  const prompt = `Recommend the next sales action for this account.
Company: ${params.name}
Overall Score: ${params.overallScore}/100
Risk Level: ${params.riskLevel}
Signal Count: ${params.signalsCount}

Return ONLY valid JSON with keys: action_type (prepare_outreach|research_more|watchlist|request_review|do_not_contact), title, body, priority (low|medium|high|urgent).`;

  const res = await aiAgentFetch("/v1/agent/chat", {
    messages: [{ role: "user", content: prompt }],
    model_preference: "iai-one/iris-7",
    language: "en",
    metadata: { surface: "cios", feature: "action-recommendation" },
  });

  if (!res.ok || !res.output) {
    // Fallback rule-based recommendation — explicitly labeled as non-AI
    const score = params.overallScore;
    const risk = params.riskLevel;
    if (score >= 80 && risk === "low")
      return {
        actionType: "prepare_outreach",
        title: "Prepare outreach",
        body: "High score + low risk. Draft personalized outreach.",
        priority: "high",
      };
    if (score >= 60 && risk !== "high")
      return {
        actionType: "research_more",
        title: "Research more",
        body: "Promising but needs more validation before outreach.",
        priority: "medium",
      };
    if (risk === "high")
      return {
        actionType: "request_review",
        title: "Request review",
        body: "Risk flags detected. Review before any contact.",
        priority: "urgent",
      };
    return {
      actionType: "watchlist",
      title: "Add to watchlist",
      body: "Monitor for stronger signals before acting.",
      priority: "low",
    };
  }

  try {
    const json = JSON.parse(
      res.output.replace(/```json\n?|\n?```/g, "").trim(),
    ) as {
      action_type?: string;
      title?: string;
      body?: string;
      priority?: string;
    };
    const validTypes = [
      "prepare_outreach",
      "research_more",
      "watchlist",
      "request_review",
      "do_not_contact",
    ];
    const validPriorities = ["low", "medium", "high", "urgent"];
    return {
      actionType: validTypes.includes(json.action_type || "")
        ? (json.action_type as string)
        : "watchlist",
      title: json.title || "Recommended action",
      body: json.body || "",
      priority: validPriorities.includes(json.priority || "")
        ? (json.priority as "low" | "medium" | "high" | "urgent")
        : "low",
    };
  } catch {
    return {
      actionType: "watchlist",
      title: "AI parse failed",
      body: "Could not parse AI recommendation. Default to watchlist.",
      priority: "low",
    };
  }
}
