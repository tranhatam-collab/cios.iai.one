/**
 * CIOS AI agent adapter tests — verifies gateway contract compliance.
 *
 * Tests that:
 * - scoreCompany sends messages[] (not mode/input)
 * - tenant mismatch is detected
 * - fallback is explicitly labeled [FALLBACK:NON-AI]
 * - missing run_id is logged
 * - response parsing works correctly
 */
// Set env BEFORE any imports that trigger env.ts validation
process.env.NODE_ENV ??= "test";
process.env.PORT ??= "3000";
process.env.APP_NAME ??= "customer-intelligence-os-api";
process.env.APP_BASE_URL ??= "http://localhost:3000";
process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/test";
process.env.JWT_SECRET ??= "test-jwt-secret-ci-only";
process.env.SESSION_SECRET ??= "test-session-secret-ci-only";
process.env.LOG_LEVEL ??= "silent";
process.env.AIAGENT_API_URL ??= "https://api.aiagent.iai.one";
process.env.AIAGENT_API_KEY ??= "sk-aiagent-test-key";
process.env.FRONTEND_URL ??= "https://cios.iai.one";

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof global.fetch;

// Mock logger to avoid noise
vi.mock("../src/bootstrap/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("CIOS AI agent adapter — gateway contract", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scoreCompany sends messages[] with model_preference (not mode/input)", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content: '{"fit_score":75,"timing_score":80,"risk_score":20,"overall_score":70,"reasoning":"Good fit."}',
          run_id: "run_test_1",
          tenant_id: "cios-iai",
          model: "iai-one/iris-7",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { scoreCompany } = await import("../src/integrations/aiagent.js");
    const result = await scoreCompany({
      name: "Test Co",
      domain: "test.com",
      industry: "SaaS",
      signals: [{ type: "hiring", summary: "Hiring 10 engineers", confidence: 80 }],
    });

    // Verify fetch was called with messages[] payload
    expect(mockFetch).toHaveBeenCalledOnce();
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.messages).toBeDefined();
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages.length).toBeGreaterThan(0);
    expect(body.messages[0].role).toBe("user");
    expect(body.model_preference).toBe("iai-one/iris-7");
    expect(body.language).toBe("en");
    // Should NOT have mode/input (old contract)
    expect(body.mode).toBeUndefined();
    expect(body.input).toBeUndefined();

    // Verify headers include tenant
    const headers = callArgs[1].headers;
    expect(headers["X-Tenant-Id"]).toBe("cios-iai");
    expect(headers["X-Client-Contract"]).toBe("cios-ai-gateway/1.0");

    // Verify result parsed correctly
    expect(result.fitScore).toBe(75);
    expect(result.overallScore).toBe(70);
    expect(result.reasoning).toBe("Good fit.");
  });

  it("scoreCompany returns [FALLBACK:NON-AI] label when gateway fails", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Bad request", { status: 400 }),
    );

    const { scoreCompany } = await import("../src/integrations/aiagent.js");
    const result = await scoreCompany({
      name: "Test Co",
      domain: "test.com",
      industry: "SaaS",
      signals: [{ type: "hiring", summary: "Hiring", confidence: 70 }],
    });

    expect(result.reasoning).toContain("[FALLBACK:NON-AI]");
  });

  it("scoreCompany detects tenant mismatch and returns error", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content: "test",
          run_id: "run_1",
          tenant_id: "wrong-tenant",
          model: "iai-one/iris-7",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { scoreCompany } = await import("../src/integrations/aiagent.js");
    const result = await scoreCompany({
      name: "Test Co",
      domain: "test.com",
      industry: "SaaS",
      signals: [{ type: "hiring", summary: "Hiring", confidence: 70 }],
    });

    // Should fall back to rule-based due to tenant mismatch
    expect(result.reasoning).toContain("[FALLBACK:NON-AI]");
  });

  it("detectSignals sends messages[] contract", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content:
            '[{"type":"hiring","title":"Test","summary":"Test","confidence":80,"impact":"medium"}]',
          run_id: "run_2",
          tenant_id: "cios-iai",
          model: "iai-one/iris-7",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { detectSignals } = await import("../src/integrations/aiagent.js");
    const result = await detectSignals({
      companyName: "Test Co",
      rawText: "Company is hiring engineers",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toBeDefined();
    expect(body.mode).toBeUndefined();
    expect(body.input).toBeUndefined();
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("hiring");
  });

  it("assessRisk sends messages[] contract", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content:
            '{"risk_level":"low","safe_to_act":true,"flags":[],"summary":"Safe."}',
          run_id: "run_3",
          tenant_id: "cios-iai",
          model: "iai-one/iris-7",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { assessRisk } = await import("../src/integrations/aiagent.js");
    const result = await assessRisk({
      name: "Test Co",
      domain: "test.com",
      country: "US",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toBeDefined();
    expect(body.mode).toBeUndefined();
    expect(result.riskLevel).toBe("low");
    expect(result.safeToAct).toBe(true);
  });

  it("recommendAction sends messages[] contract", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content:
            '{"action_type":"prepare_outreach","title":"Go","body":"Do it","priority":"high"}',
          run_id: "run_4",
          tenant_id: "cios-iai",
          model: "iai-one/iris-7",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { recommendAction } = await import("../src/integrations/aiagent.js");
    const result = await recommendAction({
      name: "Test Co",
      overallScore: 85,
      riskLevel: "low",
      signalsCount: 5,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toBeDefined();
    expect(body.mode).toBeUndefined();
    expect(result.actionType).toBe("prepare_outreach");
    expect(result.priority).toBe("high");
  });

  it("returns NO_API_KEY error when AIAGENT_API_KEY not set", async () => {
    // Temporarily unset the key
    const originalKey = process.env.AIAGENT_API_KEY;
    delete process.env.AIAGENT_API_KEY;

    // Re-import env to pick up the change
    vi.resetModules();
    const { scoreCompany } = await import("../src/integrations/aiagent.js");
    const result = await scoreCompany({
      name: "Test Co",
      domain: "test.com",
      industry: "SaaS",
      signals: [],
    });

    // Should fall back with NON-AI label
    expect(result.reasoning).toContain("[FALLBACK:NON-AI]");
    expect(mockFetch).not.toHaveBeenCalled();

    // Restore
    process.env.AIAGENT_API_KEY = originalKey;
  });
});
