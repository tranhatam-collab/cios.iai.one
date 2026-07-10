import { fail, ok } from "./envelope";
import { signHs256Jwt } from "./jwt-sign";
import type { WorkerEnv } from "./persistence";
import { requireAuth } from "./auth";

type MemberRecord = {
  userId: string;
  workspaceId: string;
  workspaceCode: string;
  email: string;
  displayName: string;
  role: string;
  plan: string;
};

type StoredUser = MemberRecord & {
  passwordHash: string;
};

const memoryUsers = new Map<string, StoredUser>();

const DEMO_WORKSPACE = {
  workspaceId: "ws_demo",
  workspaceCode: "demo",
  plan: "enterprise"
};

function userKey(workspaceCode: string, email: string): string {
  return `${workspaceCode.toLowerCase()}:${email.toLowerCase()}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100_000,
      hash: "SHA-256"
    },
    key,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  return actual === expectedHash;
}

async function seedDemoUser(env: WorkerEnv): Promise<void> {
  const email = env.AUTH_DEMO_EMAIL ?? "admin@iai.one";
  const password = env.AUTH_DEMO_PASSWORD ?? "demo123456";
  const key = userKey(DEMO_WORKSPACE.workspaceCode, email);
  if (memoryUsers.has(key)) return;
  const salt = `cios-demo:${email}`;
  memoryUsers.set(key, {
    userId: "usr_demo_admin",
    workspaceId: DEMO_WORKSPACE.workspaceId,
    workspaceCode: DEMO_WORKSPACE.workspaceCode,
    email,
    displayName: "CIOS Demo Admin",
    role: "admin",
    plan: DEMO_WORKSPACE.plan,
    passwordHash: await hashPassword(password, salt)
  });
}

function toPublicMember(user: StoredUser): MemberRecord {
  return {
    userId: user.userId,
    workspaceId: user.workspaceId,
    workspaceCode: user.workspaceCode,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    plan: user.plan
  };
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function handleAuthRegister(
  request: Request,
  env: WorkerEnv,
  traceId: string
): Promise<Response> {
  await seedDemoUser(env);
  const parsed = await request.json().catch(() => null);
  const body = parseJsonRecord(parsed);
  if (!body) {
    return fail(400, "VALIDATION_FAILED", "Invalid register payload.", undefined, traceId);
  }

  const email = readString(body, "email");
  const password = readString(body, "password");
  const workspaceCode = readString(body, "workspaceCode") ?? DEMO_WORKSPACE.workspaceCode;
  const displayName = readString(body, "displayName") ?? "Member";
  const role = readString(body, "role") ?? "sales_rep";

  if (!email || !password || password.length < 8) {
    return fail(400, "VALIDATION_FAILED", "Email and password (min 8 chars) are required.", undefined, traceId);
  }

  const key = userKey(workspaceCode, email);
  if (memoryUsers.has(key)) {
    return fail(409, "AUTH_EMAIL_EXISTS", "Email already exists in workspace.", { workspaceCode, email }, traceId);
  }

  const userId = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const salt = `cios:${workspaceCode}:${email}`;
  memoryUsers.set(key, {
    userId,
    workspaceId: workspaceCode === DEMO_WORKSPACE.workspaceCode ? DEMO_WORKSPACE.workspaceId : `ws_${workspaceCode}`,
    workspaceCode,
    email,
    displayName,
    role,
    plan: workspaceCode === DEMO_WORKSPACE.workspaceCode ? DEMO_WORKSPACE.plan : "starter",
    passwordHash: await hashPassword(password, salt)
  });

  return ok({ member: toPublicMember(memoryUsers.get(key)!) }, { route: "/v1/auth/register" }, traceId);
}

export async function handleAuthSession(
  request: Request,
  env: WorkerEnv,
  traceId: string
): Promise<Response> {
  await seedDemoUser(env);
  if (!env.JWT_SECRET) {
    return fail(500, "CONFIG_ERROR", "JWT_SECRET is not configured.", undefined, traceId);
  }

  const parsed = await request.json().catch(() => null);
  const body = parseJsonRecord(parsed);
  if (!body) {
    return fail(400, "VALIDATION_FAILED", "Invalid session payload.", undefined, traceId);
  }

  const email = readString(body, "email");
  const password = readString(body, "password");
  const workspaceCode = readString(body, "workspaceCode") ?? DEMO_WORKSPACE.workspaceCode;
  if (!email || !password) {
    return fail(400, "VALIDATION_FAILED", "Email and password are required.", undefined, traceId);
  }

  const key = userKey(workspaceCode, email);
  const user = memoryUsers.get(key);
  if (!user) {
    return fail(401, "AUTH_INVALID_CREDENTIALS", "Invalid credentials.", { reason: "user_not_found" }, traceId);
  }

  const salt = user.email === (env.AUTH_DEMO_EMAIL ?? "admin@iai.one")
    ? `cios-demo:${user.email}`
    : `cios:${workspaceCode}:${email}`;
  const valid = await verifyPassword(password, salt, user.passwordHash);
  if (!valid) {
    return fail(401, "AUTH_INVALID_CREDENTIALS", "Invalid credentials.", { reason: "password_mismatch" }, traceId);
  }

  const member = toPublicMember(user);
  const token = await signHs256Jwt(
    {
      sub: member.userId,
      userId: member.userId,
      workspaceId: member.workspaceId,
      workspaceCode: member.workspaceCode,
      email: member.email,
      name: member.displayName,
      role: member.role,
      plan: member.plan,
      iss: env.JWT_ISSUER ?? "cios.iai.one",
      aud: env.JWT_AUDIENCE ?? "cios-workers-api"
    },
    env.JWT_SECRET
  );

  return ok({ token, member }, { route: "/v1/auth/session" }, traceId);
}

export async function handleAuthMe(
  request: Request,
  env: WorkerEnv,
  traceId: string
): Promise<Response> {
  const auth = await requireAuth(request, traceId, env);
  if (auth instanceof Response) return auth;

  const claims = auth.claims;
  const member: MemberRecord = {
    userId: String(claims.userId ?? claims.sub ?? auth.subject),
    workspaceId: String(claims.workspaceId ?? "ws_unknown"),
    workspaceCode: String(claims.workspaceCode ?? "demo"),
    email: String(claims.email ?? "unknown@iai.one"),
    displayName: String(claims.name ?? "Member"),
    role: String(claims.role ?? auth.role),
    plan: String(claims.plan ?? "starter")
  };

  return ok({ member }, { route: "/v1/auth/me" }, traceId);
}

export async function handleAuthLogout(
  request: Request,
  env: WorkerEnv,
  traceId: string
): Promise<Response> {
  const auth = await requireAuth(request, traceId, env);
  if (auth instanceof Response) return auth;
  return ok({ logged_out: true }, { route: "/v1/auth/logout", subject: auth.subject }, traceId);
}

export async function handleMeta(env: WorkerEnv, traceId: string): Promise<Response> {
  return ok(
    {
      service: "cios-workers-api",
      release: {
        name: "cios-workers-api",
        version: "0.2.0",
        apiCompat: "v1",
        environment: "workers",
        contract: env.API_CONTRACT ?? "phase2-workers-v1"
      },
      capabilities: {
        auth: true,
        system: true,
        flow: true,
        events: true
      }
    },
    { route: "/v1/meta" },
    traceId
  );
}
