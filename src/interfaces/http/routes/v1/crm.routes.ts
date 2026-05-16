import type { FastifyInstance } from "fastify";

import { ERROR_CODES } from "../../../../app/error-codes.js";
import { ACTIONS, requireAction } from "../../../../app/permissions.js";
import {
  getOrganizationById,
  listOrganizationsPaginated,
} from "../../../../repositories/crm.repository.js";
import { envelopeError, envelopeOk } from "../../response-envelope.js";

export async function registerV1CrmRoutes(app: FastifyInstance): Promise<void> {
  app.get("/crm/organizations", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.crmOrganizationsRead,
    );
    if (!user) return;

    const q = request.query as {
      search?: string;
      page?: number | string;
      page_size?: number | string;
    };
    const pageNum = Number(q.page ?? 1);
    const pageSizeNum = Number(q.page_size ?? 20);
    const workspaceCode = user.workspaceCode ?? "demo";
    const paged = await listOrganizationsPaginated({
      workspaceCode,
      search: q.search?.trim(),
      page: Number.isFinite(pageNum) ? pageNum : 1,
      pageSize: Number.isFinite(pageSizeNum) ? pageSizeNum : 20,
    });

    return envelopeOk(request, {
      total: paged.total,
      page: paged.page,
      page_size: paged.pageSize,
      organizations: paged.items,
    });
  });

  app.get("/crm/organizations/:id", async (request, reply) => {
    const user = await requireAction(
      request,
      reply,
      ACTIONS.crmOrganizationRead,
    );
    if (!user) return;

    const { id } = request.params as { id: string };
    const workspaceCode = user.workspaceCode ?? "demo";
    const org = await getOrganizationById({ workspaceCode, id });
    if (!org) {
      return reply.status(404).send(
        envelopeError(request, {
          code: ERROR_CODES.resourceNotFound,
          message: "Organization not found.",
          details: { resource: "organization", id },
        }),
      );
    }

    return envelopeOk(request, { organization: org });
  });
}
