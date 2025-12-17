import { registerAs } from "@nestjs/config";
import { z } from "zod";

const SupabaseEnvSchema = z.object({
  SUPABASE_URL: z.string().url().default("http://127.0.0.1:54321"),
  SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
});

export type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export const supabaseConfig = registerAs("supabase", (): SupabaseConfig => {
  const env = SupabaseEnvSchema.parse(process.env);
  return {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
});

