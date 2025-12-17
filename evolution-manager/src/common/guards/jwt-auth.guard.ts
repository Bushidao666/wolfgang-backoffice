import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

import { verifyHs256Jwt } from "../auth/jwt";
import { UserRole } from "../enums/user-role.enum";

type RequestUser = {
  sub: string;
  email?: string;
  role: UserRole;
  company_id?: string;
  permissions: string[];
  schema_name?: string;
  raw: Record<string, unknown>;
};

function getUserRole(payload: Record<string, unknown>): UserRole {
  const appMetadata = (payload["app_metadata"] as Record<string, unknown> | undefined) ?? {};
  const userMetadata = (payload["user_metadata"] as Record<string, unknown> | undefined) ?? {};
  const roleRaw = (appMetadata["role"] as string | undefined) ?? (userMetadata["role"] as string | undefined);
  return (Object.values(UserRole) as string[]).includes(roleRaw ?? "")
    ? (roleRaw as UserRole)
    : UserRole.CrmUser;
}

function getCompanyId(payload: Record<string, unknown>): string | undefined {
  const appMetadata = (payload["app_metadata"] as Record<string, unknown> | undefined) ?? {};
  const userMetadata = (payload["user_metadata"] as Record<string, unknown> | undefined) ?? {};
  return (appMetadata["company_id"] as string | undefined) ?? (userMetadata["company_id"] as string | undefined);
}

function getPermissions(payload: Record<string, unknown>): string[] {
  const appMetadata = (payload["app_metadata"] as Record<string, unknown> | undefined) ?? {};
  const userMetadata = (payload["user_metadata"] as Record<string, unknown> | undefined) ?? {};
  const raw = (appMetadata["permissions"] as unknown) ?? (userMetadata["permissions"] as unknown);
  return Array.isArray(raw) ? raw.filter((p): p is string => typeof p === "string") : [];
}

function getSchemaName(payload: Record<string, unknown>): string | undefined {
  const appMetadata = (payload["app_metadata"] as Record<string, unknown> | undefined) ?? {};
  const userMetadata = (payload["user_metadata"] as Record<string, unknown> | undefined) ?? {};
  return (appMetadata["schema_name"] as string | undefined) ?? (userMetadata["schema_name"] as string | undefined);
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers?.authorization as string | undefined;
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException("Missing bearer token");

    const token = auth.slice("Bearer ".length).trim();
    if (!token) throw new UnauthorizedException("Missing bearer token");

    const secret =
      process.env.SUPABASE_JWT_SECRET?.trim() ||
      process.env.JWT_SECRET?.trim() ||
      "dev-secret";

    try {
      const payload = verifyHs256Jwt(token, secret) as unknown as Record<string, unknown>;
      const user: RequestUser = {
        sub: String(payload["sub"]),
        email: typeof payload["email"] === "string" ? payload["email"] : undefined,
        role: getUserRole(payload),
        company_id: getCompanyId(payload),
        permissions: getPermissions(payload),
        schema_name: getSchemaName(payload),
        raw: payload,
      };
      request.user = user;
      return true;
    } catch (err) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}

