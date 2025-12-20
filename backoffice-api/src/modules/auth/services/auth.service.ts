import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";

import { ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import { UserRole } from "../../../common/enums/user-role.enum";
import { LoginDto } from "../dto/login.dto";

function isHoldingRole(role?: string): boolean {
  return role === UserRole.SuperAdmin || role === UserRole.BackofficeAdmin || role === UserRole.AiSupervisor;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function extractRoleFromAccessToken(accessToken: string): string | null {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return null;
  const appMetadata = payload["app_metadata"];
  const userMetadata = payload["user_metadata"];

  const fromAppMeta = appMetadata && typeof appMetadata === "object" ? (appMetadata as any)["role"] : null;
  if (typeof fromAppMeta === "string" && fromAppMeta.trim()) return fromAppMeta;

  const fromUserMeta = userMetadata && typeof userMetadata === "object" ? (userMetadata as any)["role"] : null;
  if (typeof fromUserMeta === "string" && fromUserMeta.trim()) return fromUserMeta;

  const fromRoot = payload["role"];
  return typeof fromRoot === "string" && fromRoot.trim() ? fromRoot : null;
}

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  private anon(): SupabaseClient {
    return this.supabase.getAnonClient();
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.anon().auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const role = extractRoleFromAccessToken(data.session.access_token);
    if (!isHoldingRole(role ?? undefined)) {
      throw new ForbiddenException("Holding-only");
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      user: data.user,
    };
  }

  async refresh(refreshToken: string) {
    const { data, error } = await this.anon().auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const role = extractRoleFromAccessToken(data.session.access_token);
    if (!isHoldingRole(role ?? undefined)) {
      throw new ForbiddenException("Holding-only");
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      user: data.user,
    };
  }

  async logout(accessToken?: string) {
    if (accessToken) {
      await this.supabase
        .getUserClient(accessToken)
        .auth.signOut()
        .catch(() => undefined);
    }
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const origin = (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",")[0]?.trim() || "http://localhost:3000";
    const redirectTo = `${origin.replace(/\/+$/, "")}/reset-password`;

    const { error } = await this.anon().auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      throw new ValidationError("Failed to request password reset", { error });
    }
    return { ok: true };
  }

  async resetPassword(accessToken: string, newPassword: string) {
    const { data, error } = await this.supabase.getUserClient(accessToken).auth.updateUser({ password: newPassword });
    if (error) {
      throw new UnauthorizedException("Invalid or expired reset token");
    }
    return { ok: true, user: data.user };
  }
}
