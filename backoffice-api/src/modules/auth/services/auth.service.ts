import { Injectable, UnauthorizedException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";

import { ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import { LoginDto } from "../dto/login.dto";

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
