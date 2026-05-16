import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app/create-app.js";

describe("crm organizations pagination contract", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let token = "";

  const email = `qa-crm-pagination-${Date.now()}@iai.one`;
  const password = "demo123456";

  beforeAll(async () => {
    app = await createApp();

    await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email,
        password,
        displayName: "CRM Pagination QA",
        workspaceCode: "demo",
        role: "sales_rep",
      },
    });

    const session = await app.inject({
      method: "POST",
      url: "/v1/auth/session",
      payload: {
        email,
        password,
        workspaceCode: "demo",
      },
    });
    token = (JSON.parse(session.body) as { data: { token: string } }).data
      .token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns pagination fields and constrained page size", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/crm/organizations?page=1&page_size=1",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: {
        total: number;
        page: number;
        page_size: number;
        organizations: Array<{ id: string; name: string }>;
      };
    };

    expect(body.ok).toBe(true);
    expect(body.data.page).toBe(1);
    expect(body.data.page_size).toBe(1);
    expect(body.data.total).toBeGreaterThanOrEqual(
      body.data.organizations.length,
    );
    expect(body.data.organizations.length).toBeLessThanOrEqual(1);
  });

  it("supports page traversal and does not exceed total", async () => {
    const first = await app.inject({
      method: "GET",
      url: "/v1/crm/organizations?page=1&page_size=2",
      headers: { authorization: `Bearer ${token}` },
    });
    const second = await app.inject({
      method: "GET",
      url: "/v1/crm/organizations?page=2&page_size=2",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);

    const firstBody = JSON.parse(first.body) as {
      data: {
        total: number;
        page: number;
        page_size: number;
        organizations: Array<{ id: string }>;
      };
    };
    const secondBody = JSON.parse(second.body) as {
      data: {
        total: number;
        page: number;
        page_size: number;
        organizations: Array<{ id: string }>;
      };
    };

    expect(firstBody.data.page).toBe(1);
    expect(secondBody.data.page).toBe(2);
    expect(firstBody.data.page_size).toBe(2);
    expect(secondBody.data.page_size).toBe(2);
    expect(firstBody.data.total).toBe(secondBody.data.total);
    expect(
      firstBody.data.organizations.length +
        secondBody.data.organizations.length,
    ).toBeLessThanOrEqual(firstBody.data.total);
  });
});
