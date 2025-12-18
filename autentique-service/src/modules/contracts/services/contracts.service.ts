import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { AutentiqueClient } from "../../../infrastructure/autentique/autentique.client";
import { EventBusService } from "../../../infrastructure/messaging/event-bus.service";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import { LoggerService } from "../../../common/logging/logger.service";
import { RedisChannels } from "@wolfgang/contracts";
import { buildContractCreatedEvent } from "../events/contract-created.event";
import { CreateContractDto } from "../dto/create-contract.dto";
import { ContractsQueryDto } from "../dto/contracts-query.dto";
import { AutentiqueIntegrationService } from "./autentique-integration.service";

type TemplateRow = {
  id: string;
  company_id: string | null;
  name: string;
  variables: unknown[] | null;
  file_path: string | null;
  file_type: string | null;
};

type DealIndexRow = { id: string; schema_name: string; local_deal_id: string };

function ensureSchemaName(schemaName: unknown): string {
  if (!schemaName || typeof schemaName !== "string") throw new ValidationError("Missing tenant schema");
  if (!/^[a-z0-9_]+$/i.test(schemaName)) throw new ValidationError("Invalid tenant schema", { schemaName });
  return schemaName;
}

function ensureUuid(id: unknown, label: string): string {
  if (!id || typeof id !== "string") throw new ValidationError(`Missing ${label}`);
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) throw new ValidationError(`Invalid ${label}`, { id });
  return id;
}

function inferFileType(template: TemplateRow): string {
  if (template.file_type) return template.file_type;
  const path = template.file_path?.toLowerCase() ?? "";
  if (path.endsWith(".pdf")) return "pdf";
  if (path.endsWith(".docx")) return "docx";
  if (path.endsWith(".txt")) return "txt";
  return "application/octet-stream";
}

@Injectable()
export class ContractsService {
  private readonly templatesBucket = "contract_templates";
  private readonly dealFilesBucket = "deal_files";

  constructor(
    private readonly supabase: SupabaseService,
    private readonly autentique: AutentiqueClient,
    private readonly integrations: AutentiqueIntegrationService,
    private readonly events: EventBusService,
    private readonly logger: LoggerService,
  ) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async create(dto: CreateContractDto, meta: { correlation_id?: string | undefined }) {
    const companyId = ensureUuid(dto.company_id, "company_id");
    const templateId = ensureUuid(dto.template_id, "template_id");

    const dealIndex = await this.resolveDealIndex(companyId, dto);
    const schemaName = ensureSchemaName(dealIndex.schema_name);
    const localDealId = ensureUuid(dealIndex.local_deal_id, "local_deal_id");

    const template = await this.getTemplate(companyId, templateId);
    if (!template.file_path) throw new ValidationError("Template file is missing (file_path)");

    const deal = await this.getDeal(companyId, schemaName, localDealId);
    const leadId = deal?.core_lead_id ? String(deal.core_lead_id) : null;

    const lead = leadId
      ? await this.admin().schema("core").from("leads").select("*").eq("id", leadId).eq("company_id", companyId).maybeSingle()
      : { data: null, error: null };
    if (lead.error) throw new ValidationError("Failed to load lead", { error: lead.error });

    const signer = this.resolveSigner(dto, deal, lead.data ?? null);

    const rawTemplate = await this.downloadTemplateFile(template.file_path);
    const fileType = inferFileType(template);
    const context = this.buildContext(dto, deal, lead.data ?? null);

    const { filename, contentType, buffer } = this.renderTemplate({
      template,
      fileType,
      templateBuffer: rawTemplate,
      context,
    });

    const creds = await this.integrations.resolveForCompany(companyId);
    const autentiqueCredentials = { api_key: creds.api_key, base_url: creds.base_url };

    const docTitle = `${template.name || "Contrato"}${deal?.deal_full_name ? ` - ${String(deal.deal_full_name)}` : ""}`;
    const created = await this.autentique.createDocument(autentiqueCredentials, {
      document: { name: docTitle },
      signers: [signer],
      file: { filename, contentType, buffer },
      organization_id: creds.organization_id,
      folder_id: creds.folder_id,
    });

    const signatureLink =
      created.signature_short_link ??
      (created.signature_public_id
        ? await this.autentique.createSignatureLink(autentiqueCredentials, created.signature_public_id)
        : undefined);

    const dealValueRaw = deal?.deal_valor_contrato;
    const inferredValue = dealValueRaw === null || dealValueRaw === undefined ? undefined : Number(dealValueRaw);
    const contractValue = dto.value ?? inferredValue;
    if (contractValue !== undefined && (!Number.isFinite(contractValue) || contractValue < 0)) {
      throw new ValidationError("Invalid contract value", { value: contractValue });
    }
    const currency = dto.currency ?? "BRL";

    const contractId = randomUUID();
    const contractData = {
      ...context,
      schema_name: schemaName,
      local_deal_id: localDealId,
      signature_public_id: created.signature_public_id,
    };

    const { data: contract, error } = await this.admin()
      .schema("core")
      .from("contracts")
      .insert({
        id: contractId,
        company_id: companyId,
        lead_id: leadId,
        deal_index_id: dealIndex.id,
        template_id: templateId,
        status: "sent",
        contract_url: signatureLink ?? null,
        autentique_id: created.document_id,
        autentique_credential_set_id: creds.credential_set_id ?? null,
        contract_data: contractData,
        value: contractValue ?? null,
      })
      .select("*")
      .single();
    if (error) throw new ValidationError("Failed to persist contract", { error });

    await this.updateDealStatus(companyId, schemaName, localDealId, {
      deal_status: "contrato_enviado",
      deal_valor_contrato: contractValue,
    });

    await this.events.publish(
      RedisChannels.CONTRACT_CREATED,
      buildContractCreatedEvent({
        company_id: companyId,
        contract_id: contractId,
        deal_id: dealIndex.id,
        value: contractValue,
        currency,
        correlation_id: meta.correlation_id ?? contractId,
      }),
    );

    this.logger.log("contract.created", {
      company_id: companyId,
      contract_id: contractId,
      deal_index_id: dealIndex.id,
      schema_name: schemaName,
      local_deal_id: localDealId,
    });

    return contract;
  }

  async list(query: ContractsQueryDto) {
    const companyId = ensureUuid(query.company_id, "company_id");

    let q = this.admin().schema("core").from("contracts").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    if (query.deal_index_id) q = q.eq("deal_index_id", query.deal_index_id);
    if (query.lead_id) q = q.eq("lead_id", query.lead_id);

    const { data, error } = await q;
    if (error) throw new ValidationError("Failed to list contracts", { error });
    return data ?? [];
  }

  async get(args: { company_id: string; contract_id: string }) {
    const companyId = ensureUuid(args.company_id, "company_id");
    const contractId = ensureUuid(args.contract_id, "contract_id");

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

  private async resolveDealIndex(companyId: string, dto: CreateContractDto): Promise<DealIndexRow> {
    if (dto.deal_index_id) {
      const { data, error } = await this.admin()
        .schema("core")
        .from("deals_index")
        .select("id, schema_name, local_deal_id")
        .eq("id", dto.deal_index_id)
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw new ValidationError("Failed to load deal index", { error });
      if (!data) throw new NotFoundError("Deal index not found");
      return {
        id: String(data.id),
        schema_name: String((data as any).schema_name),
        local_deal_id: String((data as any).local_deal_id),
      };
    }

    const schemaName = ensureSchemaName(dto.schema_name);
    const localDealId = ensureUuid(dto.local_deal_id, "local_deal_id");
    const { data, error } = await this.admin()
      .schema("core")
      .from("deals_index")
      .select("id, schema_name, local_deal_id")
      .eq("company_id", companyId)
      .eq("schema_name", schemaName)
      .eq("local_deal_id", localDealId)
      .maybeSingle();
    if (error) throw new ValidationError("Failed to load deal index", { error });
    if (!data) throw new NotFoundError("Deal index not found");
    return {
      id: String(data.id),
      schema_name: String((data as any).schema_name),
      local_deal_id: String((data as any).local_deal_id),
    };
  }

  private async getTemplate(companyId: string, templateId: string): Promise<TemplateRow> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("contract_templates")
      .select("id, company_id, name, variables, file_path, file_type")
      .eq("id", templateId)
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .maybeSingle();
    if (error) throw new ValidationError("Failed to load template", { error });
    if (!data) throw new NotFoundError("Template not found");
    return data as unknown as TemplateRow;
  }

  private async downloadTemplateFile(path: string): Promise<Buffer> {
    const { data, error } = await this.admin().storage.from(this.templatesBucket).download(path);
    if (error) throw new ValidationError("Failed to download template file", { error });
    const arr = await data.arrayBuffer();
    return Buffer.from(arr);
  }

  private async getDeal(companyId: string, schemaName: string, localDealId: string): Promise<any> {
    const { data, error } = await this.admin().schema(schemaName).from("deals").select("*").eq("id", localDealId).eq("company_id", companyId).maybeSingle();
    if (error) throw new ValidationError("Failed to load deal", { error });
    if (!data) throw new NotFoundError("Deal not found");
    return data;
  }

  private resolveSigner(dto: CreateContractDto, deal: any, lead: any | null) {
    const email = dto.signer_email ?? deal?.deal_email ?? lead?.email ?? null;
    const phone = dto.signer_phone ?? deal?.deal_phone ?? lead?.phone ?? null;
    const name = dto.signer_name ?? deal?.deal_full_name ?? lead?.name ?? null;

    if (email) {
      return { email: String(email), name: name ? String(name) : undefined, action: "SIGN", delivery_method: "DELIVERY_METHOD_EMAIL" } as const;
    }

    if (phone) {
      return { phone: String(phone), name: name ? String(name) : undefined, action: "SIGN", delivery_method: "DELIVERY_METHOD_WHATSAPP" } as const;
    }

    throw new ValidationError("Signer email or phone is required");
  }

  private buildContext(dto: CreateContractDto, deal: any, lead: any | null): Record<string, unknown> {
    const base: Record<string, unknown> = {};

    if (lead) {
      base.lead_id = lead.id;
      base.lead_name = lead.name;
      base.lead_phone = lead.phone;
      base.lead_email = lead.email;
    }

    if (deal && typeof deal === "object") {
      Object.assign(base, deal);
    }

    return { ...base, ...(dto.contract_data ?? {}) };
  }

  private renderTemplate(args: {
    template: TemplateRow;
    fileType: string;
    templateBuffer: Buffer;
    context: Record<string, unknown>;
  }): { filename: string; contentType: string; buffer: Buffer } {
    const fileType = args.fileType.toLowerCase();
    const templateName = args.template.name?.replace(/[^a-zA-Z0-9._-]+/g, "_") || "contract";

    if (fileType === "docx") {
      const zip = new PizZip(args.templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "{{", end: "}}" },
      });
      doc.render(args.context);
      const out = doc.getZip().generate({ type: "nodebuffer" });
      return { filename: `${templateName}.docx`, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: out };
    }

    if (fileType === "txt" || fileType.startsWith("text/")) {
      const text = args.templateBuffer.toString("utf8");
      const rendered = Object.entries(args.context).reduce((acc, [key, value]) => {
        const val = value === null || value === undefined ? "" : String(value);
        return acc.replaceAll(`{{${key}}}`, val).replaceAll(`{${key}}`, val);
      }, text);
      return { filename: `${templateName}.txt`, contentType: "text/plain", buffer: Buffer.from(rendered, "utf8") };
    }

    if (fileType === "pdf") {
      return { filename: `${templateName}.pdf`, contentType: "application/pdf", buffer: args.templateBuffer };
    }

    return { filename: `${templateName}`, contentType: "application/octet-stream", buffer: args.templateBuffer };
  }

  private async updateDealStatus(
    companyId: string,
    schemaName: string,
    localDealId: string,
    patch: { deal_status: string; deal_valor_contrato?: number | undefined },
  ) {
    const update: Record<string, unknown> = { deal_status: patch.deal_status };
    if (patch.deal_valor_contrato !== undefined) update.deal_valor_contrato = patch.deal_valor_contrato;
    const { error } = await this.admin().schema(schemaName).from("deals").update(update).eq("id", localDealId).eq("company_id", companyId);
    if (error) throw new ValidationError("Failed to update deal status", { error });
  }
}
