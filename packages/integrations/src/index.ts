import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptJson } from "@wolfgang/crypto";

export type IntegrationProvider = "autentique" | "evolution" | "openai";
export type IntegrationMode = "global" | "custom" | "disabled";

export type ResolvedIntegration = {
  provider: IntegrationProvider;
  source: "global" | "custom";
  credential_set_id?: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
};

export { testAutentiqueIntegration } from "./providers/autentique";
export { testEvolutionIntegration } from "./providers/evolution";
export { testOpenAIIntegration } from "./providers/openai";

type IntegrationCredentialSetRow = {
  id: string;
  provider: IntegrationProvider;
  name: string;
  is_default: boolean;
  config: Record<string, unknown> | null;
  secrets_enc: string | null;
};

type CompanyIntegrationBindingRow = {
  id: string;
  company_id: string;
  provider: IntegrationProvider;
  mode: IntegrationMode;
  credential_set_id: string | null;
  config_override: Record<string, unknown> | null;
  secrets_override_enc: string | null;
};

async function loadDefaultSet(admin: SupabaseClient, provider: IntegrationProvider): Promise<IntegrationCredentialSetRow> {
  const { data, error } = await admin
    .schema("core")
    .from("integration_credential_sets")
    .select("id, provider, name, is_default, config, secrets_enc")
    .eq("provider", provider)
    .eq("is_default", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Missing default credential set for provider=${provider}`);
  return data as unknown as IntegrationCredentialSetRow;
}

async function loadSetById(admin: SupabaseClient, id: string): Promise<IntegrationCredentialSetRow> {
  const { data, error } = await admin
    .schema("core")
    .from("integration_credential_sets")
    .select("id, provider, name, is_default, config, secrets_enc")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Credential set not found: ${id}`);
  return data as unknown as IntegrationCredentialSetRow;
}

export async function resolveCompanyIntegration(args: {
  supabaseAdmin: SupabaseClient;
  companyId: string;
  provider: IntegrationProvider;
}): Promise<ResolvedIntegration | null> {
  const { supabaseAdmin: admin, companyId, provider } = args;

  const { data: binding, error } = await admin
    .schema("core")
    .from("company_integration_bindings")
    .select("id, company_id, provider, mode, credential_set_id, config_override, secrets_override_enc")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;

  const row = (binding as unknown as CompanyIntegrationBindingRow | null) ?? null;
  if (!row) {
    const set = await loadDefaultSet(admin, provider);
    return {
      provider,
      source: "global",
      credential_set_id: set.id,
      config: set.config ?? {},
      secrets: decryptJson(set.secrets_enc ?? ""),
    };
  }

  if (row.mode === "disabled") return null;

  if (row.mode === "custom") {
    return {
      provider,
      source: "custom",
      config: row.config_override ?? {},
      secrets: decryptJson(row.secrets_override_enc ?? ""),
    };
  }

  const set = row.credential_set_id ? await loadSetById(admin, row.credential_set_id) : await loadDefaultSet(admin, provider);
  return {
    provider,
    source: "global",
    credential_set_id: set.id,
    config: set.config ?? {},
    secrets: decryptJson(set.secrets_enc ?? ""),
  };
}
