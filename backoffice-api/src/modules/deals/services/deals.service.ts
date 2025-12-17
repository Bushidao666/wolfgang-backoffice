import { Injectable } from "@nestjs/common";

import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { PostgresService } from "../../../infrastructure/postgres/postgres.service";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";

function ensureSchemaName(schemaName: unknown): string {
  if (!schemaName || typeof schemaName !== "string") throw new ValidationError("Missing company CRM schema");
  if (!/^[a-z0-9_]+$/i.test(schemaName)) throw new ValidationError("Invalid schema name", { schemaName });
  return schemaName;
}

@Injectable()
export class DealsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly postgres: PostgresService,
  ) {}

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
    const schemaIdent = `"${schema}"`;

    const conditions: string[] = ["company_id = $1"];
    const params: unknown[] = [companyId];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`deal_status = $${params.length}`);
    }

    if (filters.from) {
      params.push(filters.from);
      conditions.push(`created_at >= $${params.length}`);
    }

    if (filters.to) {
      params.push(filters.to);
      conditions.push(`created_at <= $${params.length}`);
    }

    if (filters.q) {
      params.push(`%${filters.q}%`);
      const idx = params.length;
      conditions.push(`(deal_full_name ilike $${idx} or deal_phone ilike $${idx} or deal_email ilike $${idx})`);
    }

    try {
      const { rows } = await this.postgres.query(
        `select id, company_id, core_lead_id, deal_full_name, deal_phone, deal_email, deal_status, deal_servico, deal_valor_contrato, created_at, updated_at
         from ${schemaIdent}.deals
         where ${conditions.join(" and ")}
         order by created_at desc`,
        params,
      );
      return rows ?? [];
    } catch (err) {
      throw new ValidationError("Failed to list deals", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  async get(companyId: string, dealId: string) {
    const schema = await this.getCompanySchema(companyId);
    const schemaIdent = `"${schema}"`;

    try {
      const { rows } = await this.postgres.query(
        `select *
         from ${schemaIdent}.deals
         where id = $1 and company_id = $2
         limit 1`,
        [dealId, companyId],
      );
      const row = rows?.[0];
      if (!row) throw new NotFoundError("Deal not found");
      return row;
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw new ValidationError("Failed to load deal", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  async stats(companyId: string) {
    const schema = await this.getCompanySchema(companyId);
    const schemaIdent = `"${schema}"`;

    try {
      const { rows } = await this.postgres.query<{ deal_status: string | null }>(
        `select deal_status
         from ${schemaIdent}.deals
         where company_id = $1`,
        [companyId],
      );

      const counts: Record<string, number> = {};
      for (const row of rows ?? []) {
        const status = String(row.deal_status ?? "unknown");
        counts[status] = (counts[status] ?? 0) + 1;
      }
      return { company_id: companyId, by_status: counts, total: (rows ?? []).length };
    } catch (err) {
      throw new ValidationError("Failed to load deal stats", { error: err instanceof Error ? err.message : String(err) });
    }
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
