import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { SupabaseConfig } from "../../config/supabase.config";

@Injectable()
export class SupabaseService {
  private readonly config: SupabaseConfig;

  private adminClient?: SupabaseClient;
  private anonClient?: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<SupabaseConfig>("supabase") ?? {
      url: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
      anonKey: process.env.SUPABASE_ANON_KEY ?? "",
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    };
  }

  getAdminClient(): SupabaseClient {
    if (!this.adminClient) {
      if (!this.config.serviceRoleKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin client");
      }
      this.adminClient = createClient(this.config.url, this.config.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this.adminClient;
  }

  getAnonClient(): SupabaseClient {
    if (!this.anonClient) {
      if (!this.config.anonKey) {
        throw new Error("SUPABASE_ANON_KEY is required for anon client");
      }
      this.anonClient = createClient(this.config.url, this.config.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this.anonClient;
  }

  getUserClient(accessToken: string): SupabaseClient {
    const anonKey = this.config.anonKey;
    if (!anonKey) {
      throw new Error("SUPABASE_ANON_KEY is required for user client");
    }

    return createClient(this.config.url, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
}

