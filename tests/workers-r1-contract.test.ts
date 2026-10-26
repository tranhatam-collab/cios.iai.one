/**
 * R1 Workers contract tests (E3–E9 subset) against the Worker fetch handler
 * with in-memory env (no D1 / KV required).
 */
import { describe, expect, it } from "vitest";

import worker from "../services/api/src/worker.ts";
import type { WorkerEnv } from "../services/api/src/lib/persistence.ts";

const JWT_SECRET = "r1-test-jwt-secret-at-least-32-chars";
const FLOW_SECRET = "r1-test-flow-webhook-secret";

function makeEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    JWT_SECRET,
    FLOW_WEBHOOK_SECRET: FLOW_SECRET,
    ALLOW_DEMO_SEED: "false",
    API_CONTRACT: "phase2-workers-v1",
    ...overrides
  } as WorkerEnv;
}

async function call(
  env: WorkerEnv,
  method: string,
  path: string,
  init: { body?: unknown; token?: string; headers?: Record<string, string> } = {}
) {
  const headers: Record<string, string> = {
    ...(init.headers ?? {})
  };
  if (init.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (init.token) {
    headers.authorization = `Bearer ${init.token}`;
  }
  const request = new Request(`https://cios-workers-api.test${path}`, {
    method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined
  });
  const response = await worker.fetch(request, env);
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, json, response };
}

describe("Workers R1 contract", () => {
  it("E4: register ignores client role:admin and assigns sales_rep", async () => {
    const env = makeEnv();
    const email = `r1_${crypto.randomUUID().slice(0, 8)}@example.com`;
    const reg = await call(env, "POST", "/v1/auth/register", {
      body: { email, password: "password123", role: "admin", displayName: "R1" }
    });
    expect(reg.status).toBe(200);
    const member = (reg.json.data as { member: { role: string } }).member;
    expect(member.role).toBe("sales_rep");

    const session = await call(env, "POST", "/v1/auth/session", {
      body: { email, password: "password123" }
    });
    expect(session.status).toBe(200);
    const token = (session.json.data as { token: string }).token;
    expect(token).toBeTruthy();

    const me = await call(env, "GET", "/v1/auth/me", { token });
    expect(me.status).toBe(200);
  });

  it("E2: wrong password returns 401", async () => {
    const env = makeEnv();
    const email = `r1_bad_${crypto.randomUUID().slice(0, 8)}@example.com`;
    await call(env, "POST", "/v1/auth/register", {
      body: { email, password: "password123" }
    });
    const session = await call(env, "POST", "/v1/auth/session", {
      body: { email, password: "wrong-password" }
    });
    expect(session.status).toBe(401);
  });

  it("E3: demo seed disabled by default → demo login 401", async () => {
    const env = makeEnv({ ALLOW_DEMO_SEED: "false" });
    const session = await call(env, "POST", "/v1/auth/session", {
      body: { email: "demo@iai.one", password: "demo123456" }
    });
    expect(session.status).toBe(401);
  });

  it("E5: logout revoke → me returns 401", async () => {
    const env = makeEnv();
    const email = `r1_out_${crypto.randomUUID().slice(0, 8)}@example.com`;
    await call(env, "POST", "/v1/auth/register", {
      body: { email, password: "password123" }
    });
    const session = await call(env, "POST", "/v1/auth/session", {
      body: { email, password: "password123" }
    });
    const token = (session.json.data as { token: string }).token;

    const logout = await call(env, "POST", "/v1/auth/logout", { token, body: {} });
    expect(logout.status).toBe(200);

    const me = await call(env, "GET", "/v1/auth/me", { token });
    expect(me.status).toBe(401);
  });

  it("E7/E8: bootstrap, overview, CRM, discovery require auth and succeed with JWT", async () => {
    const env = makeEnv();
    const email = `r1_prod_${crypto.randomUUID().slice(0, 8)}@example.com`;
    await call(env, "POST", "/v1/auth/register", {
      body: { email, password: "password123" }
    });
    const session = await call(env, "POST", "/v1/auth/session", {
      body: { email, password: "password123" }
    });
    const token = (session.json.data as { token: string }).token;

    expect((await call(env, "GET", "/v1/bootstrap")).status).toBe(401);
    expect((await call(env, "GET", "/v1/crm/organizations")).status).toBe(401);

    const bootstrap = await call(env, "GET", "/v1/bootstrap", { token });
    expect(bootstrap.status).toBe(200);
    expect(bootstrap.json.ok).toBe(true);

    const overview = await call(env, "GET", "/v1/overview", { token });
    expect(overview.status).toBe(200);

    const orgs = await call(env, "GET", "/v1/crm/organizations", { token });
    expect(orgs.status).toBe(200);
    const orgData = orgs.json.data as { organizations: unknown[] };
    expect(Array.isArray(orgData.organizations)).toBe(true);
    expect(orgData.organizations.length).toBeGreaterThan(0);

    const sources = await call(env, "GET", "/v1/discovery/sources", { token });
    expect(sources.status).toBe(200);
    const queue = (sources.json.data as { queue: unknown[] }).queue;
    expect(Array.isArray(queue)).toBe(true);

    const audit = await call(env, "GET", "/v1/compliance/audit", { token });
    expect(audit.status).toBe(200);

    const review = await call(env, "GET", "/v1/review/queue", { token });
    expect(review.status).toBe(200);
  });

  it("E9: flow callback missing/invalid signature → 401; missing secret → CONFIG_ERROR", async () => {
    const env = makeEnv();
    const missing = await call(env, "POST", "/v1/flow/callback", {
      body: {
        flow_run_id: "fr_1",
        trigger_name: "t",
        status: "success",
        completed_at: new Date().toISOString(),
        trace_id: "tr_1"
      }
    });
    expect(missing.status).toBe(401);

    const noSecret = await call(
      makeEnv({ FLOW_WEBHOOK_SECRET: undefined }),
      "POST",
      "/v1/flow/callback",
      {
        body: {
          flow_run_id: "fr_1",
          trigger_name: "t",
          status: "success",
          completed_at: new Date().toISOString(),
          trace_id: "tr_1"
        },
        headers: { "x-flow-signature": "deadbeef" }
      }
    );
    expect(noSecret.status).toBe(500);
    expect((noSecret.json.error as { code: string }).code).toBe("CONFIG_ERROR");
  });

  it("E10-ish: homepage honesty — public product routes stay auth-gated", async () => {
    const env = makeEnv();
    for (const path of [
      "/v1/overview",
      "/v1/crm/organizations",
      "/v1/discovery/sources",
      "/v1/review/queue"
    ]) {
      const res = await call(env, "GET", path);
      expect(res.status).toBe(401);
    }
  });

  it("CORS: disallowed origin is not reflected", async () => {
    const env = makeEnv();
    const request = new Request("https://cios-workers-api.test/v1/meta", {
      method: "GET",
      headers: { origin: "https://evil.example" }
    });
    const response = await worker.fetch(request, env);
    expect(response.headers.get("access-control-allow-origin")).not.toBe(
      "https://evil.example"
    );
  });

  it("tenant: register ignores client workspaceCode (no open join)", async () => {
    const env = makeEnv();
    const email = `r1_ws_${crypto.randomUUID().slice(0, 8)}@example.com`;
    const reg = await call(env, "POST", "/v1/auth/register", {
      body: {
        email,
        password: "password123",
        workspaceCode: "victim-corp"
      }
    });
    expect(reg.status).toBe(200);
    const member = (reg.json.data as { member: { workspaceCode: string } }).member;
    expect(member.workspaceCode).toBe("demo");
  });

  it("R2 deferred CRM paths return 501 not org detail", async () => {
    const env = makeEnv();
    const email = `r1_501_${crypto.randomUUID().slice(0, 8)}@example.com`;
    await call(env, "POST", "/v1/auth/register", {
      body: { email, password: "password123" }
    });
    const session = await call(env, "POST", "/v1/auth/session", {
      body: { email, password: "password123" }
    });
    const token = (session.json.data as { token: string }).token;
    const enrich = await call(env, "GET", "/v1/crm/organizations/org_x/enrich", {
      token
    });
    expect(enrich.status).toBe(501);
    const payment = await call(env, "GET", "/v1/payment/plans", { token });
    expect(payment.status).toBe(501);
  });
});
