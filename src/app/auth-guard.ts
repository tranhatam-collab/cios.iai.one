import type { FastifyReply, FastifyRequest } from "fastify";

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "compliance_admin"
  | "sales_manager"
  | "sales_rep"
  | "analyst"
  | "reviewer"
  | "finance"
  | "support"
  | "readonly";

export type RolePattern = WorkspaceRole | "sales_*";

export type TokenUser = {
  sub: string;
  userId: string;
  workspaceId: string;
  workspaceCode: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  plan: string;
};

function roleMatches(pattern: RolePattern, role: string | undefined): boolean {
  if (!role) {
    return false;
  }
  if (pattern === "sales_*") {
    return role === "sales_manager" || role === "sales_rep";
  }
  return role === pattern;
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<TokenUser | null> {
  try {
    await request.jwtVerify<TokenUser>();
    return request.user as TokenUser;
  } catch {
    await reply.status(401).send({ ok: false, error: "unauthorized" });
    return null;
  }
}

export async function requireRoles(
  request: FastifyRequest,
  reply: FastifyReply,
  allowed: RolePattern[]
): Promise<TokenUser | null> {
  const user = await requireAuth(request, reply);
  if (!user) {
    return null;
  }

  const ok = allowed.some((pattern) => roleMatches(pattern, user.role));
  if (!ok) {
    await reply.status(403).send({
      ok: false,
      error: "forbidden",
      requiredRoles: allowed
    });
    return null;
  }

  return user;
}
