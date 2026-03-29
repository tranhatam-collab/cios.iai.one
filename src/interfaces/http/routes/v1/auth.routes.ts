import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireAuth, requireRoles, type WorkspaceRole } from "../../../../app/auth-guard.js";
import { listAuthAudit, recordAuthAudit } from "../../../../repositories/auth-audit.repository.js";
import { loginMember, registerMember } from "../../../../repositories/auth.repository.js";

const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(80).default("Member"),
  workspaceCode: z.string().min(2).max(64).default("demo"),
  role: z
    .enum(["owner", "admin", "compliance_admin", "sales_manager", "sales_rep", "analyst", "readonly"])
    .default("sales_rep")
});

const SessionInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  workspaceCode: z.string().min(2).max(64).default("demo")
});

type MemberPayload = {
  sub: string;
  userId: string;
  workspaceId: string;
  workspaceCode: string;
  email: string;
  name: string;
  role: string;
  plan: string;
};

export async function registerV1AuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", async (request, reply) => {
    const parsed = RegisterInput.safeParse(request.body);
    if (!parsed.success) {
      await recordAuthAudit({
        event: "register",
        result: "failed",
        reason: "invalid_payload",
        ip: request.ip,
        userAgent: request.headers["user-agent"]
      });
      return reply.status(400).send({
        ok: false,
        error: "invalid_payload",
        details: parsed.error.flatten()
      });
    }

    const body = parsed.data;
    const created = await registerMember(parsed.data);
    if ("error" in created) {
      await recordAuthAudit({
        workspaceCode: body.workspaceCode,
        email: body.email,
        role: body.role,
        event: "register",
        result: "failed",
        reason: created.error,
        ip: request.ip,
        userAgent: request.headers["user-agent"]
      });
      return reply.status(created.error === "email_exists" ? 409 : 404).send({
        ok: false,
        error: created.error
      });
    }

    await recordAuthAudit({
      workspaceCode: created.member.workspaceCode,
      userId: created.member.userId,
      email: created.member.email,
      role: created.member.role,
      event: "register",
      result: "success",
      ip: request.ip,
      userAgent: request.headers["user-agent"]
    });

    return {
      ok: true,
      member: created.member
    };
  });

  app.post("/auth/session", async (request, reply) => {
    const parsed = SessionInput.safeParse(request.body);
    if (!parsed.success) {
      await recordAuthAudit({
        event: "login",
        result: "failed",
        reason: "invalid_payload",
        ip: request.ip,
        userAgent: request.headers["user-agent"]
      });
      return reply.status(400).send({
        ok: false,
        error: "invalid_payload",
        details: parsed.error.flatten()
      });
    }

    const login = await loginMember(parsed.data);
    if ("error" in login) {
      await recordAuthAudit({
        workspaceCode: parsed.data.workspaceCode,
        email: parsed.data.email,
        event: "login",
        result: "failed",
        reason: login.error,
        ip: request.ip,
        userAgent: request.headers["user-agent"]
      });
      return reply.status(401).send({ ok: false, error: login.error });
    }

    const member: MemberPayload = {
      sub: login.member.userId,
      userId: login.member.userId,
      workspaceId: login.member.workspaceId,
      workspaceCode: login.member.workspaceCode,
      email: login.member.email,
      name: login.member.displayName,
      role: login.member.role,
      plan: login.member.plan
    };

    const token = await reply.jwtSign(member, { expiresIn: "12h" });
    await recordAuthAudit({
      workspaceCode: login.member.workspaceCode,
      userId: login.member.userId,
      email: login.member.email,
      role: login.member.role,
      event: "login",
      result: "success",
      ip: request.ip,
      userAgent: request.headers["user-agent"]
    });

    return {
      ok: true,
      token,
      member
    };
  });

  app.get("/auth/me", async (request, reply) => {
    const user = await requireAuth(request, reply);
    if (!user) {
      await recordAuthAudit({
        event: "me",
        result: "failed",
        reason: "unauthorized",
        ip: request.ip,
        userAgent: request.headers["user-agent"]
      });
      return;
    }

    await recordAuthAudit({
      workspaceCode: user.workspaceCode,
      userId: user.userId,
      email: user.email,
      role: user.role,
      event: "me",
      result: "success",
      ip: request.ip,
      userAgent: request.headers["user-agent"]
    });
    return { ok: true, member: user };
  });

  app.get("/auth/audit", async (request, reply) => {
    const user = await requireRoles(request, reply, ["owner", "admin", "compliance_admin"]);
    if (!user) {
      await recordAuthAudit({
        event: "auth_audit_read",
        result: "failed",
        reason: "forbidden_or_unauthorized",
        ip: request.ip,
        userAgent: request.headers["user-agent"]
      });
      return;
    }

    const entries = await listAuthAudit(user.workspaceCode);
    await recordAuthAudit({
      workspaceCode: user.workspaceCode,
      userId: user.userId,
      email: user.email,
      role: user.role,
      event: "auth_audit_read",
      result: "success",
      ip: request.ip,
      userAgent: request.headers["user-agent"]
    });

    return {
      ok: true,
      entries
    };
  });
}
