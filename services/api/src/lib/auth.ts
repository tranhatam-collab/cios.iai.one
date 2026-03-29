import { fail } from "./envelope";

export type Role = "observer" | "operator" | "governor" | "root";

export type AuthContext = {
  token: string;
  role: Role;
  subject: string;
};

function parseBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function extractRoleFromToken(token: string): Role {
  const lowered = token.toLowerCase();
  if (lowered.includes("root")) return "root";
  if (lowered.includes("governor")) return "governor";
  if (lowered.includes("operator")) return "operator";
  return "observer";
}

export function requireAuth(request: Request, traceId: string): AuthContext | Response {
  const token = parseBearerToken(request);
  if (!token) {
    return fail(401, "UNAUTHORIZED", "Missing or invalid bearer token.", undefined, traceId);
  }
  return {
    token,
    role: extractRoleFromToken(token),
    subject: "token-subject"
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
