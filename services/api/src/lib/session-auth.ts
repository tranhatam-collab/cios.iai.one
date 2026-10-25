import { fail, ok } from "./envelope";
import { signHs256Jwt } from "./jwt-sign";
import {
  ensurePersistenceSchema,
  revokeToken,
  type WorkerEnv
} from "./persistence";
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
  passwordSalt: string;
};

const memoryUsers = new Map<string, StoredUser>();

const DEMO_WORKSPACE = {
  workspaceId: "ws_demo",
  workspaceCode: "demo",
  plan: "starter"
};

const REGISTER_ROLE = "sales_rep";
const DEMO_ROLE = "sales_rep";

function userKey(workspaceCode: string, email: string): string {
  return `${workspaceCode.toLowerCase()}:${email.toLowerCase()}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
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

async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  return actual === expectedHash;
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

function demoSeedAllowed(env: WorkerEnv): boolean {
  return String(env.ALLOW_DEMO_SEED ?? "").toLowerCase() === "true";
}

async function getUser(env: WorkerEnv, key: string): Promise<StoredUser | null> {
  if (env.CIOS_DB) {
    await ensurePersistenceSchema(env);
    const row = await env.CIOS_DB.prepare(
      `
      SELECT user_id, workspace_id, workspace_code, email, display_name, role, plan,
             password_hash, password_salt
      FROM api_users WHERE user_key = ? LIMIT 1
      `
    )
      .bind(key)
      .first<{
        user_id: string;
        workspace_id: string;
        workspace_code: string;
        email: string;
        display_name: string;
        role: string;
        plan: string;
        password_hash: string;
        password_salt: string;
      }>();
    if (!row) return null;
    return {
      userId: row.user_id,
      workspaceId: row.workspace_id,
      workspaceCode: row.workspace_code,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      plan: row.plan,
      passwordHash: row.password_hash,
      passwordSalt: row.password_salt
    };
  }
  return memoryUsers.get(key) ?? null;
}

async function putUser(env: WorkerEnv, key: string, user: StoredUser): Promise<void> {
  const now = new Date().toISOString();
  if (env.CIOS_DB) {
    await ensurePersistenceSchema(env);
    await env.CIOS_DB.prepare(
      `
      INSERT INTO api_users (
        user_key, user_id, workspace_id, workspace_code, email, display_name,
        role, plan, password_hash, password_salt, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_key) DO UPDATE SET
        display_name = excluded.display_name,
        role = excluded.role,
        plan = excluded.plan,
        password_hash = excluded.password_hash,
        password_salt = excluded.password_salt,
        updated_at = excluded.updated_at
      `
    )
      .bind(
        key,
        user.userId,
        user.workspaceId,
        user.workspaceCode,
        user.email,
        user.displayName,
        user.role,
        user.plan,
        user.passwordHash,
        user.passwordSalt,
        now,
        now
      )
      .run();
    return;
  }
  memoryUsers.set(key, user);
}

async function seedDemoUser(env: WorkerEnv): Promise<void> {
  if (!demoSeedAllowed(env)) return;
  if (!env.AUTH_DEMO_PASSWORD) return;

  const email = env.AUTH_DEMO_EMAIL ?? "admin@iai.one";
  const key = userKey(DEMO_WORKSPACE.workspaceCode, email);
  const existing = await getUser(env, key);
  if (existing) return;

  const salt = randomSalt();
  await putUser(env, key, {
    userId: "usr_demo_operator",
    workspaceId: DEMO_WORKSPACE.workspaceId,
    workspaceCode: DEMO_WORKSPACE.workspaceCode,
    email,
    displayName: "CIOS Demo Operator",
    role: DEMO_ROLE,
    plan: DEMO_WORKSPACE.plan,
    passwordHash: await hashPassword(env.AUTH_DEMO_PASSWORD, salt),
    passwordSalt: salt
  });
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
  // R1: open register cannot pick an arbitrary tenant (blocks workspace join).
  // Client-supplied workspaceCode is ignored; always land in the demo workspace.
  const workspaceCode = DEMO_WORKSPACE.workspaceCode;
  const displayName = readString(body, "displayName") ?? "Member";
  // Server-assigned only — ignore client-supplied role (R1)
  const role = REGISTER_ROLE;

  if (!email || !password || password.length < 8) {
    return fail(400, "VALIDATION_FAILED", "Email and password (min 8 chars) are required.", undefined, traceId);
  }

  const key = userKey(workspaceCode, email);
  if (await getUser(env, key)) {
    return fail(409, "AUTH_EMAIL_EXISTS", "Email already registered.", undefined, traceId);
  }

  const userId = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const salt = randomSalt();
  const user: StoredUser = {
    userId,
    workspaceId: DEMO_WORKSPACE.workspaceId,
    workspaceCode,
    email,
    displayName,
    role,
    plan: DEMO_WORKSPACE.plan,
    passwordHash: await hashPassword(password, salt),
    passwordSalt: salt
  };
  await putUser(env, key, user);

  return ok({ member: toPublicMember(user) }, { route: "/v1/auth/register" }, traceId);
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
  const user = await getUser(env, key);
  // Same message/body whether missing user or bad password (no enumeration).
  if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) {
    return fail(401, "AUTH_INVALID_CREDENTIALS", "Invalid credentials.", undefined, traceId);
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

  const jti = typeof auth.claims.jti === "string" ? auth.claims.jti : null;
  const exp = typeof auth.claims.exp === "number" ? auth.claims.exp : null;
  if (jti && exp) {
    await revokeToken(env, {
      jti,
      userId: auth.subject,
      expiresAtMs: exp * 1000
    });
  }

  return ok({ logged_out: true }, { route: "/v1/auth/logout", subject: auth.subject }, traceId);
}

export async function handleMeta(env: WorkerEnv, traceId: string): Promise<Response> {
  return ok(
    {
      service: "cios-workers-api",
      release: {
        name: "cios-workers-api",
        version: "0.3.0",
        apiCompat: "v1",
        environment: "workers",
        contract: env.API_CONTRACT ?? "phase2-workers-v1"
      },
      capabilities: {
        auth: true,
        system: true,
        flow: true,
        events: true,
        crm: true,
        discovery: true,
        bootstrap: true,
        overview: true
      }
    },
    { route: "/v1/meta" },
    traceId
  );
}
