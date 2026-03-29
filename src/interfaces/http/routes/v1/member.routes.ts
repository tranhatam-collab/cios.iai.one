import type { FastifyInstance } from "fastify";

import { getMemberPlans } from "../../../../repositories/member.repository.js";

export async function registerV1MemberRoutes(app: FastifyInstance): Promise<void> {
  app.get("/members/plans", async () => {
    const plans = await getMemberPlans();
    return { ok: true, plans };
  });
}
