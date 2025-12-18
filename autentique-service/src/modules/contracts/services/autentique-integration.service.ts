import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";

import { decryptJson } from "@wolfgang/crypto";
import { resolveCompanyIntegration } from "@wolfgang/integrations";
import { ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";

export type AutentiqueResolved = {
  api_key: string;
  base_url: string;
  webhook_secret: string;
  organization_id?: number;
  folder_id?: string;
  source: "global" | "custom";
  credential_set_id?: string;
};

function readString(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const value = obj[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

@Injectable()
export class AutentiqueIntegrationService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async resolveForCompany(companyId: string): Promise<AutentiqueResolved> {
    try {
      const resolved = await resolveCompanyIntegration({ supabaseAdmin: this.admin(), companyId, provider: "autentique" });
      if (!resolved) {
        throw new ValidationError("Autentique integration is disabled for company", { company_id: companyId });
      }
      return this.parseResolved(resolved);
    } catch (err) {
      const apiKey = process.env.AUTENTIQUE_API_KEY?.trim() ?? "";
      const webhookSecret = process.env.AUTENTIQUE_WEBHOOK_SECRET?.trim() ?? "";
      const baseUrl = process.env.AUTENTIQUE_BASE_URL?.trim() || "https://api.autentique.com.br";

      if (apiKey) {
        if (!webhookSecret) {
          throw new ServiceUnavailableException("AUTENTIQUE_WEBHOOK_SECRET is required to verify webhooks");
        }
        return { api_key: apiKey, webhook_secret: webhookSecret, base_url: baseUrl, source: "global" };
      }

      if (err instanceof ValidationError) throw err;
      throw new ServiceUnavailableException("Autentique integration not configured");
    }
  }

  async resolveForCredentialSetId(credentialSetId: string): Promise<AutentiqueResolved> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("integration_credential_sets")
      .select("id, provider, config, secrets_enc")
      .eq("id", credentialSetId)
      .maybeSingle();
    if (error) throw new ValidationError("Failed to load integration credential set", { error });
    if (!data) throw new NotFoundException("Credential set not found");

    const provider = String((data as any).provider ?? "");
    if (provider !== "autentique") {
      throw new ValidationError("Credential set provider mismatch", { expected: "autentique", provider });
    }

    const config = ((data as any).config ?? {}) as Record<string, unknown>;
    const secretsEnc = String((data as any).secrets_enc ?? "");
    const secrets = decryptJson(secretsEnc);

    const base_url = readString(config, "base_url") ?? process.env.AUTENTIQUE_BASE_URL?.trim() ?? "https://api.autentique.com.br";
    const api_key = readString(secrets, "api_key") ?? "";
    const webhook_secret = readString(secrets, "webhook_secret") ?? "";
    if (!api_key) throw new ServiceUnavailableException("Autentique credential set is missing api_key");
    if (!webhook_secret) throw new ServiceUnavailableException("Autentique credential set is missing webhook_secret");

    return {
      api_key,
      webhook_secret,
      base_url,
      organization_id: readNumber(config, "organization_id"),
      folder_id: readString(config, "folder_id") ?? undefined,
      source: "global",
      credential_set_id: String((data as any).id),
    };
  }

  private parseResolved(resolved: {
    provider: string;
    source: "global" | "custom";
    credential_set_id?: string;
    config: Record<string, unknown>;
    secrets: Record<string, unknown>;
  }): AutentiqueResolved {
    const config = resolved.config ?? {};
    const secrets = resolved.secrets ?? {};

    const base_url =
      readString(config, "base_url") ??
      process.env.AUTENTIQUE_BASE_URL?.trim() ??
      "https://api.autentique.com.br";
    const api_key = readString(secrets, "api_key") ?? "";
    const webhook_secret = readString(secrets, "webhook_secret") ?? "";

    if (!api_key) throw new ServiceUnavailableException("Autentique integration is missing api_key");
    if (!webhook_secret) throw new ServiceUnavailableException("Autentique integration is missing webhook_secret");

    return {
      api_key,
      webhook_secret,
      base_url,
      organization_id: readNumber(config, "organization_id"),
      folder_id: readString(config, "folder_id") ?? undefined,
      source: resolved.source,
      credential_set_id: resolved.credential_set_id,
    };
  }
}

