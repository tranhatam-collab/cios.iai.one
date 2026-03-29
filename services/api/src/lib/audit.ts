type AuditEntry = {
  at: string;
  route: string;
  action: string;
  actor: string;
  role: string;
  result: "success" | "failed";
  traceId: string;
  details?: unknown;
};

const auditStore: AuditEntry[] = [];

export function writeAudit(entry: AuditEntry): void {
  auditStore.unshift(entry);
  if (auditStore.length > 500) {
    auditStore.length = 500;
  }
}

export function listAudit(limit = 50): AuditEntry[] {
  return auditStore.slice(0, limit);
}
