import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { SupabaseConfig } from "../../config/supabase.config";

@Injectable()
export class SupabaseService {
  private adminClient?: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  getAdminClient(): SupabaseClient {
    if (!this.adminClient) {
      const cfg = this.configService.get<SupabaseConfig>("supabase") ?? {
        url: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      };

      const key = cfg.serviceRoleKey?.trim();
      if (!key) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
      }

      this.adminClient = createClient(cfg.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    }
    return this.adminClient;
  }
}

