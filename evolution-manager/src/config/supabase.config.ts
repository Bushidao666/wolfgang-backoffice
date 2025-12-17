export type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

export const supabaseConfig = () => ({
  supabase: {
    url: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  } satisfies SupabaseConfig,
});

