import { Injectable } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";

import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  status: "active" | "suspended" | "archived";
  owner_user_id: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class CompaniesRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client(): SupabaseClient {
    return this.supabase.getAdminClient();
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const { data, error } = await this.client()
      .schema("core")
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      throw new ValidationError("Failed to check slug uniqueness", { error });
    }
    return !!data?.id;
  }

  async createCompany(input: {
    name: string;
    slug: string;
    document?: string;
    settings?: Record<string, unknown>;
    owner_user_id?: string;
  }): Promise<CompanyRow> {
    const { data, error } = await this.client()
      .schema("core")
      .from("companies")
      .insert({
        name: input.name,
        slug: input.slug,
        document: input.document ?? null,
        owner_user_id: input.owner_user_id ?? null,
        settings: input.settings ?? {},
      })
      .select("*")
      .single();

    if (error) {
      throw new ValidationError("Failed to create company", { error });
    }

    return data as CompanyRow;
  }

  async createCompanyFull(input: {
    name: string;
    slug: string;
    document?: string;
    settings?: Record<string, unknown>;
    owner_user_id?: string;
    integrations?: Array<{
      provider: string;
      mode: "global" | "custom" | "disabled";
      credential_set_id?: string;
      config_override?: Record<string, unknown>;
      secrets_override_enc?: string;
    }>;
  }): Promise<{ company: CompanyRow; schema_name: string }> {
    const payload = {
      p_name: input.name,
      p_slug: input.slug,
      p_document: input.document ?? null,
      p_owner_user_id: input.owner_user_id ?? null,
      p_settings: input.settings ?? {},
      p_integrations: input.integrations ?? null,
    };

    const { data, error } = await this.client().schema("core").rpc("fn_create_company_full", payload);
    if (error) {
      throw new ValidationError("Failed to create company", { error });
    }
    const out = data as unknown as { company?: CompanyRow; schema_name?: string } | null;
    if (!out?.company?.id || !out.schema_name) {
      throw new ValidationError("Provision function did not return company/schema", { data: out });
    }
    return { company: out.company, schema_name: out.schema_name };
  }

  async updateCompany(
    id: string,
    patch: Partial<Pick<CompanyRow, "name" | "document" | "status" | "settings">>,
  ): Promise<CompanyRow> {
    const { data, error } = await this.client()
      .schema("core")
      .from("companies")
      .update({
        ...patch,
        document: patch.document === undefined ? undefined : patch.document ?? null,
        settings: patch.settings === undefined ? undefined : patch.settings ?? {},
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new ValidationError("Failed to update company", { error });
    }
    if (!data) {
      throw new NotFoundError("Company not found");
    }
    return data as CompanyRow;
  }

  async getCompanyById(id: string): Promise<CompanyRow | null> {
    const { data, error } = await this.client()
      .schema("core")
      .from("companies")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      throw new ValidationError("Failed to fetch company", { error });
    }
    return (data as CompanyRow | null) ?? null;
  }

  async listCompanies(params: {
    page: number;
    perPage: number;
    q?: string;
    status?: CompanyRow["status"];
  }): Promise<{ rows: CompanyRow[]; total: number }> {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;

    let query = this.client()
      .schema("core")
      .from("companies")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.q) {
      query = query.ilike("name", `%${params.q}%`);
    }
    if (params.status) {
      query = query.eq("status", params.status);
    }

    const { data, error, count } = await query;
    if (error) {
      throw new ValidationError("Failed to list companies", { error });
    }

    return { rows: (data as CompanyRow[]) ?? [], total: count ?? 0 };
  }

  async archiveCompany(id: string): Promise<void> {
    const { error } = await this.client()
      .schema("core")
      .from("companies")
      .update({ status: "archived" })
      .eq("id", id);
    if (error) {
      throw new ValidationError("Failed to archive company", { error });
    }
  }

  async deleteCompany(id: string): Promise<void> {
    const { error } = await this.client().schema("core").from("companies").delete().eq("id", id);
    if (error) {
      throw new ValidationError("Failed to delete company", { error });
    }
  }

  async upsertCompanyCrm(companyId: string, schemaName: string): Promise<void> {
    const { error } = await this.client().schema("core").from("company_crms").upsert(
      {
        company_id: companyId,
        schema_name: schemaName,
        is_primary: true,
      },
      { onConflict: "company_id,schema_name" },
    );
    if (error) {
      throw new ValidationError("Failed to upsert company CRM mapping", { error });
    }
  }

  async ensureDefaultCenturionConfig(companyId: string): Promise<void> {
    const client = this.client();

    const existing = await client
      .schema("core")
      .from("centurion_configs")
      .select("id")
      .eq("company_id", companyId)
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      throw new ValidationError("Failed to check existing centurion configs", { error: existing.error });
    }
    if (existing.data?.id) return;

    const { error } = await client.schema("core").from("centurion_configs").insert({
      company_id: companyId,
      name: "Centurion Padrão",
      slug: "default",
      prompt:
        "Você é um SDR educado e objetivo. Faça perguntas para entender a necessidade do lead, coletar data, local e orçamento quando aplicável, e conduzir para o próximo passo.",
      personality: { tone: "friendly", language: "pt-BR" },
      qualification_rules: {
        required_fields: ["nome", "data", "local", "orcamento"],
        min_score: 0.7,
      },
      message_chunking_enabled: true,
      chunk_delay_ms: 1500,
      debounce_wait_ms: 3000,
      is_active: true,
    });

    if (error) {
      throw new ValidationError("Failed to create default centurion config", { error });
    }
  }

  async getPrimarySchemaName(companyId: string): Promise<string | null> {
    const { data, error } = await this.client()
      .schema("core")
      .from("company_crms")
      .select("schema_name")
      .eq("company_id", companyId)
      .eq("is_primary", true)
      .maybeSingle();

    if (error) {
      throw new ValidationError("Failed to fetch company schema mapping", { error });
    }
    return (data?.schema_name as string | undefined) ?? null;
  }

  async listCompanyUsers(companyId: string): Promise<Array<{ user_id: string; role: string; scopes: unknown }>> {
    const { data, error } = await this.client()
      .schema("core")
      .from("company_users")
      .select("user_id, role, scopes")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ValidationError("Failed to list company users", { error });
    }
    return (data as Array<{ user_id: string; role: string; scopes: unknown }>) ?? [];
  }

  async addCompanyUser(input: {
    companyId: string;
    userId: string;
    role: string;
    scopes: unknown;
  }): Promise<{ id: string; company_id: string; user_id: string; role: string; scopes: unknown }> {
    const { data, error } = await this.client()
      .schema("core")
      .from("company_users")
      .insert({
        company_id: input.companyId,
        user_id: input.userId,
        role: input.role,
        scopes: input.scopes,
      })
      .select("id, company_id, user_id, role, scopes")
      .single();

    if (error) {
      throw new ValidationError("Failed to add company user", { error });
    }
    return data as { id: string; company_id: string; user_id: string; role: string; scopes: unknown };
  }

  async removeCompanyUser(companyId: string, userId: string): Promise<void> {
    const { error } = await this.client()
      .schema("core")
      .from("company_users")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", userId);
    if (error) {
      throw new ValidationError("Failed to remove company user", { error });
    }
  }
}
