import { dbPool } from "../bootstrap/db.js";

type AuthAuditEvent = {
  workspaceCode?: string;
  userId?: string;
  email?: string;
  role?: string;
  event: string;
  result: "success" | "failed";
  reason?: string;
  ip?: string;
  userAgent?: string;
};

const memoryAudit: Array<AuthAuditEvent & { at: string }> = [];

export async function recordAuthAudit(event: AuthAuditEvent): Promise<void> {
  const payload = {
    ...event,
    email: event.email?.toLowerCase() ?? null,
    role: event.role ?? null,
    reason: event.reason ?? null,
    ip: event.ip ?? null,
    userAgent: event.userAgent ?? null
  };

  try {
    await dbPool.query(
      `
      INSERT INTO auth_session_audit_logs
        (workspace_code, user_id, email, role, event, result, reason, ip_address, user_agent)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        payload.workspaceCode ?? null,
        payload.userId ?? null,
        payload.email,
        payload.role,
        payload.event,
        payload.result,
        payload.reason,
        payload.ip,
        payload.userAgent
      ]
    );
  } catch {
    memoryAudit.unshift({ ...event, at: new Date().toISOString() });
    if (memoryAudit.length > 200) {
      memoryAudit.length = 200;
    }
  }
}

export async function listAuthAudit(workspaceCode: string): Promise<
  Array<{
    id: string;
    at: string;
    event: string;
    result: string;
    email: string | null;
    role: string | null;
    reason: string | null;
    ip: string | null;
  }>
> {
  try {
    const result = await dbPool.query<{
      id: string;
      created_at: string;
      event: string;
      result: string;
      email: string | null;
      role: string | null;
      reason: string | null;
      ip_address: string | null;
    }>(
      `
      SELECT id::text, created_at::text, event, result, email, role, reason, ip_address
      FROM auth_session_audit_logs
      WHERE workspace_code = $1
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [workspaceCode]
    );
    return result.rows.map((row) => ({
      id: row.id,
      at: row.created_at,
      event: row.event,
      result: row.result,
      email: row.email,
      role: row.role,
      reason: row.reason,
      ip: row.ip_address
    }));
  } catch {
    return memoryAudit
      .filter((item) => (item.workspaceCode ?? "demo") === workspaceCode)
      .slice(0, 100)
      .map((item, idx) => ({
        id: `mem_${idx}`,
        at: item.at,
        event: item.event,
        result: item.result,
        email: item.email ?? null,
        role: item.role ?? null,
        reason: item.reason ?? null,
        ip: item.ip ?? null
      }));
  }
}
