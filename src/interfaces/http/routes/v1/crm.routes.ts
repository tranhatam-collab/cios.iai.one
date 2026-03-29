import type { FastifyInstance } from "fastify";

import { requireRoles } from "../../../../app/auth-guard.js";
import { getOrganizationById, listOrganizations } from "../../../../repositories/crm.repository.js";

export async function registerV1CrmRoutes(app: FastifyInstance): Promise<void> {
  app.get("/crm/organizations", async (request, reply) => {
    const user = await requireRoles(request, reply, ["owner", "admin", "sales_*"]);
    if (!user) return;

    const q = request.query as { search?: string };
    const workspaceCode = user.workspaceCode ?? "demo";
    const rows = await listOrganizations({ workspaceCode, search: q.search?.trim() });

    return {
      ok: true,
      total: rows.length,
      data: rows
    };
  });

  app.get("/crm/organizations/:id", async (request, reply) => {
    const user = await requireRoles(request, reply, ["owner", "admin", "sales_*"]);
    if (!user) return;

    const { id } = request.params as { id: string };
    const workspaceCode = user.workspaceCode ?? "demo";
    const org = await getOrganizationById({ workspaceCode, id });
    if (!org) {
      return reply.status(404).send({
        ok: false,
        error: "organization_not_found"
      });
    }

    return {
      ok: true,
      data: org
    };
  });
}
