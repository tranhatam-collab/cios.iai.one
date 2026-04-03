import type { FastifyInstance } from "fastify";

import { ACTIONS, requireAction } from "../../../../app/permissions.js";
import { getMemberPlans } from "../../../../repositories/member.repository.js";
import { envelopeOk } from "../../response-envelope.js";

export async function registerV1MemberRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/members/plans", async (request, reply) => {
    const user = await requireAction(request, reply, ACTIONS.memberPlansRead);
    if (!user) return;

    const plans = await getMemberPlans();
    return envelopeOk(request, { plans });
  });
}
