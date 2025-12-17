import { Injectable } from "@nestjs/common";

import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";

function ensureSchemaName(schemaName: unknown): string {
  if (!schemaName || typeof schemaName !== "string") throw new ValidationError("Missing company CRM schema");
  if (!/^[a-z0-9_]+$/i.test(schemaName)) throw new ValidationError("Invalid schema name", { schemaName });
  return schemaName;
}

@Injectable()
export class DealsService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  private async getCompanySchema(companyId: string): Promise<string> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("company_crms")
      .select("schema_name")
      .eq("company_id", companyId)
      .eq("is_primary", true)
      .maybeSingle();
    if (error) throw new ValidationError("Failed to load company CRM", { error });
    return ensureSchemaName(data?.schema_name);
  }

  async list(companyId: string, filters: { status?: string; q?: string; from?: string; to?: string }) {
    const schema = await this.getCompanySchema(companyId);

    let query = this.admin()
      .schema(schema)
      .from("deals")
      .select(
        "id, company_id, core_lead_id, deal_full_name, deal_phone, deal_email, deal_status, deal_servico, deal_valor_contrato, created_at, updated_at",
      )
      .eq("company_id", companyId);

    if (filters.status) query = query.eq("deal_status", filters.status);
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);
    if (filters.q) {
      const pattern = `%${filters.q}%`;
      query = query.or(`deal_full_name.ilike.${pattern},deal_phone.ilike.${pattern},deal_email.ilike.${pattern}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw new ValidationError("Failed to list deals", { error });
    return data ?? [];
  }

  async get(companyId: string, dealId: string) {
    const schema = await this.getCompanySchema(companyId);

    const { data, error } = await this.admin()
      .schema(schema)
      .from("deals")
      .select("*")
      .eq("id", dealId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (error) throw new ValidationError("Failed to load deal", { error });
    if (!data) throw new NotFoundError("Deal not found");
    return data;
  }

  async stats(companyId: string) {
    const schema = await this.getCompanySchema(companyId);
    const { data, error } = await this.admin().schema(schema).from("deals").select("deal_status").eq("company_id", companyId);
    if (error) throw new ValidationError("Failed to load deal stats", { error });

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const status = String((row as any)?.deal_status ?? "unknown");
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return { company_id: companyId, by_status: counts, total: (data ?? []).length };
  }

  async timeline(companyId: string, dealId: string) {
    const schema = await this.getCompanySchema(companyId);

    const deal = await this.get(companyId, dealId);
    const leadId = String((deal as any).core_lead_id ?? "");

    const { data: idx, error: idxError } = await this.admin()
      .schema("core")
      .from("deals_index")
      .select("id")
      .eq("company_id", companyId)
      .eq("schema_name", schema)
      .eq("local_deal_id", dealId)
      .maybeSingle();
    if (idxError) throw new ValidationError("Failed to load deals index", { error: idxError });
    const dealIndexId = idx?.id ? String(idx.id) : null;

    const { data: messages, error: msgError } = leadId
      ? await this.admin()
          .schema("core")
          .from("messages")
          .select("id, direction, content_type, content, metadata, created_at")
          .eq("company_id", companyId)
          .eq("lead_id", leadId)
          .order("created_at", { ascending: true })
          .limit(200)
      : { data: [], error: null };
    if (msgError) throw new ValidationError("Failed to load messages", { error: msgError });

    const { data: contracts, error: contractsError } = dealIndexId
      ? await this.admin()
          .schema("core")
          .from("contracts")
          .select("id, status, value, signed_at, contract_url, created_at, updated_at")
          .eq("company_id", companyId)
          .eq("deal_index_id", dealIndexId)
          .order("created_at", { ascending: true })
      : { data: [], error: null };
    if (contractsError) throw new ValidationError("Failed to load contracts", { error: contractsError });

    return {
      deal,
      deal_index_id: dealIndexId,
      lead_id: leadId || null,
      messages: messages ?? [],
      contracts: contracts ?? [],
    };
  }
}
