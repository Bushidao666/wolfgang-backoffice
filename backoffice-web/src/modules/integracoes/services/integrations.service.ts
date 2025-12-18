import { apiFetch } from "@/lib/api/client";

export type IntegrationProvider = "autentique" | "evolution" | "openai";
export type IntegrationMode = "global" | "custom" | "disabled";

export type CredentialSet = {
  id: string;
  provider: IntegrationProvider;
  name: string;
  is_default: boolean;
  config: Record<string, unknown>;
  has_secrets: boolean;
  created_at: string;
  updated_at: string;
};

export type CompanyIntegrationBinding = {
  company_id: string;
  provider: IntegrationProvider;
  mode: IntegrationMode;
  credential_set_id: string | null;
  config_override: Record<string, unknown>;
  has_secrets_override: boolean;
  status: "active" | "invalid" | "testing" | string;
  last_validated_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export async function listCredentialSets(provider?: IntegrationProvider) {
  const qs = new URLSearchParams();
  if (provider) qs.set("provider", provider);
  const query = qs.toString();
  return apiFetch<CredentialSet[]>(`/integrations/credential-sets${query ? `?${query}` : ""}`);
}

export async function createCredentialSet(payload: {
  provider: IntegrationProvider;
  name: string;
  is_default?: boolean;
  config?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
}) {
  return apiFetch<CredentialSet>("/integrations/credential-sets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCredentialSet(
  id: string,
  payload: { name?: string; is_default?: boolean; config?: Record<string, unknown>; secrets?: Record<string, unknown> },
) {
  return apiFetch<CredentialSet>(`/integrations/credential-sets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCredentialSet(id: string) {
  return apiFetch<void>(`/integrations/credential-sets/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function setCredentialSetDefault(id: string) {
  return apiFetch<{ ok: true }>(`/integrations/credential-sets/${encodeURIComponent(id)}/default`, { method: "POST" });
}

export async function listCompanyIntegrationBindings(companyId: string) {
  return apiFetch<CompanyIntegrationBinding[]>(`/integrations/companies/${encodeURIComponent(companyId)}/bindings`);
}

export async function upsertCompanyIntegrationBinding(
  companyId: string,
  provider: IntegrationProvider,
  payload: {
    mode: IntegrationMode;
    credential_set_id?: string;
    config_override?: Record<string, unknown>;
    secrets_override?: Record<string, unknown>;
  },
) {
  return apiFetch<CompanyIntegrationBinding>(
    `/integrations/companies/${encodeURIComponent(companyId)}/bindings/${encodeURIComponent(provider)}`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function testCompanyIntegration(companyId: string, provider: IntegrationProvider) {
  return apiFetch<{ ok: boolean; message?: string }>(
    `/integrations/companies/${encodeURIComponent(companyId)}/test/${encodeURIComponent(provider)}`,
    { method: "POST" },
  );
}

