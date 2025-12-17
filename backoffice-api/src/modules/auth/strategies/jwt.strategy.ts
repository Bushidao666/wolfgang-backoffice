import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { UserRole } from "../../../common/enums/user-role.enum";

type SupabaseJwtPayload = {
  sub: string;
  email?: string;
  role?: string;
  exp: number;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

export type AuthenticatedUser = {
  sub: string;
  email?: string;
  role: UserRole;
  company_id?: string;
  permissions: string[];
  schema_name?: string;
  raw: SupabaseJwtPayload;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secret =
      process.env.SUPABASE_JWT_SECRET?.trim() ||
      configService.get<string>("SUPABASE_JWT_SECRET")?.trim() ||
      process.env.JWT_SECRET?.trim() ||
      "dev-secret";

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: SupabaseJwtPayload): AuthenticatedUser {
    const appRole =
      (payload.app_metadata?.["role"] as string | undefined) ??
      (payload.user_metadata?.["role"] as string | undefined);

    const companyId =
      (payload.app_metadata?.["company_id"] as string | undefined) ??
      (payload.user_metadata?.["company_id"] as string | undefined);

    const permissionsRaw =
      (payload.app_metadata?.["permissions"] as unknown) ??
      (payload.user_metadata?.["permissions"] as unknown);
    const permissions = Array.isArray(permissionsRaw)
      ? permissionsRaw.filter((p): p is string => typeof p === "string")
      : [];

    const schemaName =
      (payload.app_metadata?.["schema_name"] as string | undefined) ??
      (payload.user_metadata?.["schema_name"] as string | undefined);

    const role = (Object.values(UserRole) as string[]).includes(appRole ?? "")
      ? (appRole as UserRole)
      : UserRole.CrmUser;

    return {
      sub: payload.sub,
      email: payload.email,
      role,
      company_id: companyId,
      permissions,
      schema_name: schemaName,
      raw: payload,
    };
  }
}
