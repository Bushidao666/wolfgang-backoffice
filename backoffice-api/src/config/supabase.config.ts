import { registerAs } from "@nestjs/config";
import { z } from "zod";

import { normalizeHttpUrl } from "../common/utils/url";

const DEFAULT_SUPABASE_URL = "http://127.0.0.1:54321";

const SupabaseEnvSchema = z.object({
  SUPABASE_URL: z.string().default(DEFAULT_SUPABASE_URL),
  SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
});

export type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

const SupabaseNormalizedSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
});

export const supabaseConfig = registerAs("supabase", (): SupabaseConfig => {
  const env = SupabaseEnvSchema.parse(process.env);
  const normalized = SupabaseNormalizedSchema.safeParse({
    ...env,
    SUPABASE_URL: normalizeHttpUrl(env.SUPABASE_URL),
  });
  if (!normalized.success) {
    console.error("Invalid SUPABASE_URL; falling back to default", {
      value: env.SUPABASE_URL,
      issues: normalized.error.issues,
    });
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: env.SUPABASE_ANON_KEY,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }
  return {
    url: normalized.data.SUPABASE_URL,
    anonKey: normalized.data.SUPABASE_ANON_KEY,
    serviceRoleKey: normalized.data.SUPABASE_SERVICE_ROLE_KEY,
  };
});
