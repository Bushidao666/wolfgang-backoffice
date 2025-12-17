import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { SupabaseConfig } from "../../config/supabase.config";

@Injectable()
export class SupabaseService {
  private readonly config: SupabaseConfig;
  private adminClient?: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<SupabaseConfig>("supabase") ?? {
      url: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
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
}

