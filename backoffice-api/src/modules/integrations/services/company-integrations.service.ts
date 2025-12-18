import { Injectable } from "@nestjs/common";

import { ValidationError } from "@wolfgang/contracts";
import { encryptJson } from "@wolfgang/crypto";

import { requireAppEncryptionKey } from "../../../common/utils/require-encryption-key";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { IntegrationProvider } from "../dto/create-credential-set.dto";
import type { UpsertCompanyIntegrationDto } from "../dto/upsert-company-integration.dto";

type CompanyIntegrationRow = {
  id: string;
  company_id: string;
  provider: IntegrationProvider;
  mode: "global" | "custom" | "disabled";
  credential_set_id: string | null;
  config_override: Record<string, unknown> | null;
  secrets_override_enc: string | null;
  status: "active" | "invalid" | "testing";
  last_validated_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class CompanyIntegrationsService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async list(companyId: string) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("company_integration_bindings")
      .select("company_id, provider, mode, credential_set_id, config_override, secrets_override_enc, status, last_validated_at, last_error, created_at, updated_at")
      .eq("company_id", companyId)
      .order("provider", { ascending: true });
    if (error) throw new ValidationError("Failed to list company integrations", { error });

    return (data as CompanyIntegrationRow[]).map((row) => ({
      company_id: row.company_id,
      provider: row.provider,
      mode: row.mode,
      credential_set_id: row.credential_set_id,
      config_override: row.config_override ?? {},
      has_secrets_override: !!(row.secrets_override_enc && String(row.secrets_override_enc).trim()),
      status: row.status,
      last_validated_at: row.last_validated_at,
      last_error: row.last_error,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async upsert(companyId: string, provider: IntegrationProvider, dto: UpsertCompanyIntegrationDto) {
    const mode = dto.mode;

    const payload: Record<string, unknown> = {
      company_id: companyId,
      provider,
      mode,
      credential_set_id: mode === "global" ? dto.credential_set_id ?? null : null,
      config_override: dto.config_override ?? {},
      secrets_override_enc: mode === "custom" ? (requireAppEncryptionKey(), encryptJson(dto.secrets_override ?? {})) : "",
      status: "active",
      last_error: null,
    };

    if (mode === "global" && !dto.credential_set_id) {
      throw new ValidationError("credential_set_id is required when mode=global");
    }
    if (mode === "custom" && (!dto.secrets_override || Object.keys(dto.secrets_override).length === 0)) {
      throw new ValidationError("secrets_override is required when mode=custom");
    }

    const { data, error } = await this.admin()
      .schema("core")
      .from("company_integration_bindings")
      .upsert(payload, { onConflict: "company_id,provider" })
      .select("company_id, provider, mode, credential_set_id, config_override, secrets_override_enc, status, last_validated_at, last_error, created_at, updated_at")
      .single();
    if (error) throw new ValidationError("Failed to upsert company integration", { error });

    const row = data as unknown as CompanyIntegrationRow;
    return {
      company_id: row.company_id,
      provider: row.provider,
      mode: row.mode,
      credential_set_id: row.credential_set_id,
      config_override: row.config_override ?? {},
      has_secrets_override: !!(row.secrets_override_enc && String(row.secrets_override_enc).trim()),
      status: row.status,
      last_validated_at: row.last_validated_at,
      last_error: row.last_error,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async markValidation(companyId: string, provider: IntegrationProvider, patch: { ok: boolean; message?: string }) {
    const { error } = await this.admin()
      .schema("core")
      .from("company_integration_bindings")
      .update({
        status: patch.ok ? "active" : "invalid",
        last_validated_at: new Date().toISOString(),
        last_error: patch.ok ? null : patch.message ?? "Validation failed",
      })
      .eq("company_id", companyId)
      .eq("provider", provider);
    if (error) throw new ValidationError("Failed to update integration status", { error });
  }
}
