import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseClients = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  anon: SupabaseClient;
  admin: SupabaseClient;
};

export function getSupabaseClients(): SupabaseClients {
  const url = (process.env.SUPABASE_URL ?? "http://127.0.0.1:54321").replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!anonKey || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY for integration tests");
  }

  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return { url, anonKey, serviceRoleKey, anon, admin };
}

export async function createBackofficeAdminSession() {
  const { admin, anon } = getSupabaseClients();
  const email = `admin_${randomUUID().slice(0, 8)}@example.com`;
  const password = "P@ssw0rd!12345";

  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) {
    throw new Error(`Failed to create test user: ${created.error?.message ?? "unknown"}`);
  }

  const updated = await admin.auth.admin.updateUserById(created.data.user.id, {
    app_metadata: { role: "backoffice_admin" },
  });
  if (updated.error) {
    throw new Error(`Failed to update test user metadata: ${updated.error.message}`);
  }

  const signed = await anon.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.session) {
    throw new Error(`Failed to sign in test user: ${signed.error?.message ?? "unknown"}`);
  }

  return {
    userId: created.data.user.id,
    email,
    password,
    accessToken: signed.data.session.access_token,
    refreshToken: signed.data.session.refresh_token,
  };
}
