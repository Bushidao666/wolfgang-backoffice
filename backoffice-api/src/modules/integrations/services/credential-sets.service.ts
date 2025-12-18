import { Injectable } from "@nestjs/common";

import { ValidationError } from "@wolfgang/contracts";
import { encryptJson } from "@wolfgang/crypto";

import { requireAppEncryptionKey } from "../../../common/utils/require-encryption-key";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { CreateCredentialSetDto, IntegrationProvider } from "../dto/create-credential-set.dto";
import type { UpdateCredentialSetDto } from "../dto/update-credential-set.dto";

type CredentialSetRow = {
  id: string;
  provider: IntegrationProvider;
  name: string;
  is_default: boolean;
  config: Record<string, unknown> | null;
  secrets_enc: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class CredentialSetsService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async list(provider?: string) {
    let q = this.admin()
      .schema("core")
      .from("integration_credential_sets")
      .select("id, provider, name, is_default, config, secrets_enc, created_at, updated_at")
      .order("provider", { ascending: true })
      .order("name", { ascending: true });

    if (provider) q = q.eq("provider", provider);

    const { data, error } = await q;
    if (error) throw new ValidationError("Failed to list credential sets", { error });

    return (data as CredentialSetRow[]).map((row) => ({
      id: row.id,
      provider: row.provider,
      name: row.name,
      is_default: !!row.is_default,
      config: row.config ?? {},
      has_secrets: !!(row.secrets_enc && String(row.secrets_enc).trim()),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async create(dto: CreateCredentialSetDto, meta: { user_id?: string }) {
    const secretsEnc = dto.secrets ? (requireAppEncryptionKey(), encryptJson(dto.secrets)) : "";

    // Insert with is_default=false, then promote via RPC to avoid unique conflicts.
    const { data, error } = await this.admin()
      .schema("core")
      .from("integration_credential_sets")
      .insert({
        provider: dto.provider,
        name: dto.name.trim(),
        is_default: false,
        config: dto.config ?? {},
        secrets_enc: secretsEnc,
        created_by: meta.user_id ?? null,
      })
      .select("id, provider, name, is_default, config, secrets_enc, created_at, updated_at")
      .single();

    if (error) throw new ValidationError("Failed to create credential set", { error });

    const row = data as unknown as CredentialSetRow;

    if (dto.is_default) {
      await this.setDefault(row.id);
      row.is_default = true;
    }

    return {
      id: row.id,
      provider: row.provider,
      name: row.name,
      is_default: !!row.is_default,
      config: row.config ?? {},
      has_secrets: !!(row.secrets_enc && String(row.secrets_enc).trim()),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async update(id: string, dto: UpdateCredentialSetDto) {
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.config !== undefined) patch.config = dto.config ?? {};
    if (dto.secrets !== undefined) patch.secrets_enc = dto.secrets ? (requireAppEncryptionKey(), encryptJson(dto.secrets)) : "";
    if (dto.is_default !== undefined) patch.is_default = !!dto.is_default;

    const { data, error } = await this.admin()
      .schema("core")
      .from("integration_credential_sets")
      .update(patch)
      .eq("id", id)
      .select("id, provider, name, is_default, config, secrets_enc, created_at, updated_at")
      .maybeSingle();
    if (error) throw new ValidationError("Failed to update credential set", { error });
    if (!data) throw new ValidationError("Credential set not found");

    const row = data as unknown as CredentialSetRow;

    // If toggling to default, ensure exclusivity via RPC.
    if (dto.is_default) {
      await this.setDefault(row.id);
      row.is_default = true;
    }

    return {
      id: row.id,
      provider: row.provider,
      name: row.name,
      is_default: !!row.is_default,
      config: row.config ?? {},
      has_secrets: !!(row.secrets_enc && String(row.secrets_enc).trim()),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.admin().schema("core").from("integration_credential_sets").delete().eq("id", id);
    if (error) throw new ValidationError("Failed to delete credential set", { error });
  }

  async setDefault(id: string): Promise<void> {
    const { error } = await this.admin().schema("core").rpc("fn_set_default_integration_credential_set", { p_id: id });
    if (error) throw new ValidationError("Failed to set default credential set", { error });
  }
}
