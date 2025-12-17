import { Injectable } from "@nestjs/common";

import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { AutentiqueServiceClient } from "../../../infrastructure/clients/autentique-service.client";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { CreateContractDto } from "../dto/create-contract.dto";

function ensureSchemaName(schemaName: unknown): string {
  if (!schemaName || typeof schemaName !== "string") throw new ValidationError("Missing company CRM schema");
  if (!/^[a-z0-9_]+$/i.test(schemaName)) throw new ValidationError("Invalid schema name", { schemaName });
  return schemaName;
}

@Injectable()
export class ContractsService {
  private readonly dealFilesBucket = "deal_files";

  constructor(
    private readonly supabase: SupabaseService,
    private readonly autentique: AutentiqueServiceClient,
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

  async list(companyId: string) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("contracts")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw new ValidationError("Failed to list contracts", { error });
    return data ?? [];
  }

  async get(companyId: string, contractId: string) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("contracts")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", contractId)
      .maybeSingle();
    if (error) throw new ValidationError("Failed to load contract", { error });
    if (!data) throw new NotFoundError("Contract not found");
    return data;
  }

  async create(companyId: string, dto: CreateContractDto, opts?: { requestId?: string; correlationId?: string }) {
    const schemaName = await this.getCompanySchema(companyId);

    let deal:
      | {
          id: string;
          company_id: string;
          core_lead_id: string;
          deal_full_name: string | null;
          deal_phone: string | null;
          deal_email: string | null;
          deal_valor_contrato: string | number | null;
        }
      | undefined;

    try {
      const { data, error } = await this.admin()
        .schema(schemaName)
        .from("deals")
        .select("id, company_id, core_lead_id, deal_full_name, deal_phone, deal_email, deal_valor_contrato")
        .eq("id", dto.deal_id)
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      deal = data as any;
    } catch (err) {
      throw new ValidationError("Failed to load deal", { error: err instanceof Error ? err.message : String(err) });
    }

    if (!deal) throw new NotFoundError("Deal not found");

    const { data: idx, error: idxError } = await this.admin()
      .schema("core")
      .from("deals_index")
      .select("id")
      .eq("company_id", companyId)
      .eq("schema_name", schemaName)
      .eq("local_deal_id", dto.deal_id)
      .maybeSingle();
    if (idxError) throw new ValidationError("Failed to load deal index", { error: idxError });

    const contractValue = dto.value ?? (deal.deal_valor_contrato === null || deal.deal_valor_contrato === undefined ? undefined : Number(deal.deal_valor_contrato));
    if (contractValue !== undefined && (!Number.isFinite(contractValue) || contractValue < 0)) {
      throw new ValidationError("Invalid contract value", { value: contractValue });
    }

    return this.autentique.createContract(
      {
        company_id: companyId,
        template_id: dto.template_id,
        schema_name: schemaName,
        local_deal_id: dto.deal_id,
        deal_index_id: idx?.id ? String(idx.id) : undefined,
        value: contractValue,
        currency: dto.currency,
        signer_name: dto.signer_name ?? (deal as any).deal_full_name ?? undefined,
        signer_email: dto.signer_email ?? (deal as any).deal_email ?? undefined,
        signer_phone: dto.signer_phone ?? (deal as any).deal_phone ?? undefined,
        contract_data: dto.contract_data,
      },
      { requestId: opts?.requestId, correlationId: opts?.correlationId },
    );
  }

  async download(companyId: string, contractId: string) {
    const contract = await this.get(companyId, contractId);
    const data = (contract as any)?.contract_data;
    const signedPath = data && typeof data === "object" ? (data as any).signed_file_path : null;

    if (typeof signedPath === "string" && signedPath.trim()) {
      const { data: signed, error } = await this.admin().storage.from(this.dealFilesBucket).createSignedUrl(signedPath, 60 * 15);
      if (error) throw new ValidationError("Failed to create signed download URL", { error });
      if (!signed?.signedUrl) throw new ValidationError("Signed URL missing");
      return { url: signed.signedUrl };
    }

    if ((contract as any)?.contract_url) {
      return { url: (contract as any).contract_url };
    }

    throw new NotFoundError("Signed contract not available");
  }
}
