import { fail } from "./envelope";
import { isTokenRevoked, type WorkerEnv } from "./persistence";

export type Role = "observer" | "operator" | "governor" | "root";

export type AuthContext = {
  token: string;
  role: Role;
  subject: string;
  claims: Record<string, unknown>;
};

function parseBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const decoded = atob(padded);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function normalizeRole(roleLike: string | undefined): Role {
  const role = roleLike?.toLowerCase();
  if (!role) return "observer";
  if (role === "root") return "root";
  if (role === "governor") return "governor";
  if (role === "operator") return "operator";
  if (role === "observer") return "observer";

  if (role === "owner" || role === "admin") return "root";
  if (role === "compliance_admin" || role === "sales_manager") return "governor";
  if (role === "sales_rep" || role === "analyst" || role === "reviewer") return "operator";
  return "observer";
}

function extractRoleFromClaims(claims: Record<string, unknown>): Role {
  const single = typeof claims.role === "string" ? claims.role : undefined;
  if (single) return normalizeRole(single);
  if (Array.isArray(claims.roles)) {
    const roles = claims.roles.filter((x): x is string => typeof x === "string");
    if (roles.length === 0) return "observer";
    const mapped = roles.map((r) => normalizeRole(r));
    if (mapped.includes("root")) return "root";
    if (mapped.includes("governor")) return "governor";
    if (mapped.includes("operator")) return "operator";
  }
  return "observer";
}

async function verifyHs256Jwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const headerBytes = base64UrlToBytes(encodedHeader);
  const payloadBytes = base64UrlToBytes(encodedPayload);
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(new TextDecoder().decode(headerBytes)) as Record<string, unknown>;
    payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (header.alg !== "HS256") return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const computed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));
  const computedUrl = bytesToBase64Url(new Uint8Array(computed));
  if (computedUrl !== encodedSignature) {
    return null;
  }
  return payload;
}

function claimsTimeValid(claims: Record<string, unknown>, nowSec: number): boolean {
  const exp = typeof claims.exp === "number" ? claims.exp : undefined;
  const nbf = typeof claims.nbf === "number" ? claims.nbf : undefined;
  if (exp !== undefined && nowSec >= exp) return false;
  if (nbf !== undefined && nowSec < nbf) return false;
  return true;
}

function claimsContextValid(claims: Record<string, unknown>, env: WorkerEnv): boolean {
  if (env.JWT_ISSUER && claims.iss !== env.JWT_ISSUER) return false;
  if (!env.JWT_AUDIENCE) return true;
  const aud = claims.aud;
  if (typeof aud === "string") {
    return aud === env.JWT_AUDIENCE;
  }
  if (Array.isArray(aud)) {
    return aud.includes(env.JWT_AUDIENCE);
  }
  return false;
}

export async function requireAuth(
  request: Request,
  traceId: string,
  env: WorkerEnv
): Promise<AuthContext | Response> {
  const token = parseBearerToken(request);
  if (!token) {
    return fail(401, "UNAUTHORIZED", "Missing or invalid bearer token.", undefined, traceId);
  }

  if (!env.JWT_SECRET) {
    return fail(500, "CONFIG_ERROR", "JWT_SECRET is not configured.", undefined, traceId);
  }

  const claims = await verifyHs256Jwt(token, env.JWT_SECRET);
  if (!claims) {
    return fail(401, "UNAUTHORIZED", "JWT signature verification failed.", undefined, traceId);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!claimsTimeValid(claims, nowSec)) {
    return fail(401, "UNAUTHORIZED", "JWT is expired or not active yet.", undefined, traceId);
  }
  if (!claimsContextValid(claims, env)) {
    return fail(401, "UNAUTHORIZED", "JWT issuer/audience mismatch.", undefined, traceId);
  }

  const jti = typeof claims.jti === "string" ? claims.jti : "";
  if (jti && (await isTokenRevoked(env, jti))) {
    return fail(401, "UNAUTHORIZED", "JWT has been revoked.", undefined, traceId);
  }

  const subject =
    (typeof claims.sub === "string" && claims.sub) ||
    (typeof claims.userId === "string" && claims.userId) ||
    "jwt-subject";

  return {
    token,
    role: extractRoleFromClaims(claims),
    subject,
    claims
  };
}

const roleLevel: Record<Role, number> = {
  observer: 1,
  operator: 2,
  governor: 3,
  root: 4
};

export function requireRole(
  ctx: AuthContext,
  minRole: Role,
  traceId: string
): true | Response {
  if (roleLevel[ctx.role] < roleLevel[minRole]) {
    return fail(
      403,
      "FORBIDDEN",
      `Role ${ctx.role} cannot access this route.`,
      { required_min_role: minRole },
      traceId
    );
  }
  return true;
}
