import { randomUUID } from "node:crypto";

import { dbPool } from "../bootstrap/db.js";
import { hashPassword, verifyPassword } from "../core/password.js";

export type AuthMember = {
  userId: string;
  workspaceId: string;
  workspaceCode: string;
  email: string;
  displayName: string;
  role: string;
  plan: string;
  status: string;
};

type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  workspaceCode: string;
  role?: string;
};

type MemoryUser = AuthMember & { passwordHash: string };

const memoryUsers = new Map<string, MemoryUser>();

function memoryKey(email: string, workspaceCode: string): string {
  return `${email.toLowerCase()}::${workspaceCode.toLowerCase()}`;
}

function ensureMemoryDemoWorkspace(): void {
  const key = memoryKey("admin@iai.one", "demo");
  if (memoryUsers.has(key)) {
    return;
  }
  memoryUsers.set(key, {
    userId: randomUUID(),
    workspaceId: randomUUID(),
    workspaceCode: "demo",
    email: "admin@iai.one",
    displayName: "Demo Admin",
    role: "owner",
    plan: "growth",
    status: "active",
    passwordHash: hashPassword("demo123456")
  });
}

export async function registerMember(input: RegisterInput): Promise<{ member: AuthMember } | { error: string }> {
  const memberRole = input.role ?? "sales_rep";
  try {
    const workspace = await dbPool.query<{ id: string; code: string; plan: string }>(
      `
      SELECT id, code, COALESCE(plan, 'free') AS plan
      FROM workspaces
      WHERE code = $1 AND deleted_at IS NULL
      LIMIT 1
      `,
      [input.workspaceCode]
    );
    if (!workspace.rows[0]) {
      return { error: "workspace_not_found" };
    }

    const existing = await dbPool.query<{ id: string }>(
      `
      SELECT u.id
      FROM users u
      JOIN workspace_members wm ON wm.user_id = u.id
      WHERE u.email = $1
        AND wm.workspace_id = $2
      LIMIT 1
      `,
      [input.email, workspace.rows[0].id]
    );
    if (existing.rows[0]) {
      return { error: "email_exists" };
    }

    const passwordHash = hashPassword(input.password);
    const insertedUser = await dbPool.query<{ id: string; email: string; display_name: string }>(
      `
      INSERT INTO users (email, password_hash, display_name)
      VALUES ($1, $2, $3)
      RETURNING id, email, display_name
      `,
      [input.email, passwordHash, input.displayName]
    );

    const user = insertedUser.rows[0];
    await dbPool.query(
      `
      INSERT INTO workspace_members (workspace_id, user_id, role, status)
      VALUES ($1, $2, $3, 'active')
      `,
      [workspace.rows[0].id, user.id, memberRole]
    );

    return {
      member: {
        userId: user.id,
        workspaceId: workspace.rows[0].id,
        workspaceCode: workspace.rows[0].code,
        email: user.email,
        displayName: user.display_name,
        role: memberRole,
        plan: workspace.rows[0].plan,
        status: "active"
      }
    };
  } catch {
    // Memory fallback is disabled in production — only for local dev when DB is unavailable
    if (process.env.NODE_ENV === 'production') {
      return { error: "service_unavailable" };
    }
    ensureMemoryDemoWorkspace();
    const key = memoryKey(input.email, input.workspaceCode);
    if (memoryUsers.has(key)) {
      return { error: "email_exists" };
    }
    const member: AuthMember = {
      userId: randomUUID(),
      workspaceId: randomUUID(),
      workspaceCode: input.workspaceCode,
      email: input.email,
      displayName: input.displayName,
      role: memberRole,
      plan: "free",
      status: "active"
    };
    memoryUsers.set(key, { ...member, passwordHash: hashPassword(input.password) });
    return { member };
  }
}

export async function loginMember(input: {
  email: string;
  password: string;
  workspaceCode: string;
}): Promise<{ member: AuthMember } | { error: string }> {
  try {
    const result = await dbPool.query<{
      user_id: string;
      workspace_id: string;
      workspace_code: string;
      email: string;
      display_name: string;
      role: string;
      plan: string;
      status: string;
      password_hash: string;
    }>(
      `
      SELECT
        u.id AS user_id,
        w.id AS workspace_id,
        w.code AS workspace_code,
        u.email,
        u.display_name,
        wm.role,
        COALESCE(w.plan, 'free') AS plan,
        wm.status,
        u.password_hash
      FROM users u
      JOIN workspace_members wm ON wm.user_id = u.id
      JOIN workspaces w ON w.id = wm.workspace_id
      WHERE u.email = $1
        AND w.code = $2
        AND u.deleted_at IS NULL
        AND w.deleted_at IS NULL
      LIMIT 1
      `,
      [input.email, input.workspaceCode]
    );
    const row = result.rows[0];
    if (!row || !verifyPassword(input.password, row.password_hash)) {
      return { error: "invalid_credentials" };
    }
    return {
      member: {
        userId: row.user_id,
        workspaceId: row.workspace_id,
        workspaceCode: row.workspace_code,
        email: row.email,
        displayName: row.display_name,
        role: row.role,
        plan: row.plan,
        status: row.status
      }
    };
  } catch {
    // Memory fallback is disabled in production — only for local dev when DB is unavailable
    if (process.env.NODE_ENV === 'production') {
      return { error: "service_unavailable" };
    }
    ensureMemoryDemoWorkspace();
    const key = memoryKey(input.email, input.workspaceCode);
    const row = memoryUsers.get(key);
    if (!row || !verifyPassword(input.password, row.passwordHash)) {
      return { error: "invalid_credentials" };
    }
    const { passwordHash: _passwordHash, ...member } = row;
    return { member };
  }
}
