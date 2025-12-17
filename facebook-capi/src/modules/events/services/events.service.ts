import { Injectable } from "@nestjs/common";

import type { ContractSignedEvent, LeadCreatedEvent, LeadQualifiedEvent } from "@wolfgang/contracts";

import { LoggerService } from "../../../common/logging/logger.service";
import { RedisService } from "../../../infrastructure/redis/redis.service";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import { HashingService } from "./hashing.service";

type LeadRow = {
  id: string;
  company_id: string;
  phone: string;
  email: string | null;
  name: string | null;
  pixel_config_id: string | null;
  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  fb_data: Record<string, unknown> | null;
  contact_fingerprint: string | null;
};

type ContractRow = {
  id: string;
  company_id: string;
  lead_id: string | null;
  template_id: string;
  value: number | null;
};

type TemplateRow = { id: string; name: string };

type PixelConfigRow = {
  id: string;
  company_id: string;
  pixel_id: string;
  is_active: boolean;
  domain: string | null;
};

const QUEUE_PENDING = "capi:events:pending";

@Injectable()
export class EventsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly redis: RedisService,
    private readonly hashing: HashingService,
    private readonly logger: LoggerService,
  ) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async handleLeadCreated(event: LeadCreatedEvent): Promise<void> {
    const leadId = event.payload.lead_id;
    const lead = await this.loadLead(event.company_id, leadId);
    if (!lead?.pixel_config_id) return;

    const pixel = await this.loadPixel(event.company_id, lead.pixel_config_id);
    if (!pixel) return;

    const eventTime = Math.floor(new Date(event.occurred_at).getTime() / 1000);
    const userData = this.buildUserData(lead);
    const payload = {
      event_id: `${event.type}:${leadId}:Lead`,
      event_name: "Lead",
      event_time: eventTime,
      action_source: "chat",
      event_source_url: pixel.domain ? pixel.domain.replace(/\/$/, "") : undefined,
      user_data: userData,
      custom_data: {
        utm_campaign: lead.utm_campaign ?? undefined,
        utm_source: lead.utm_source ?? undefined,
        utm_medium: lead.utm_medium ?? undefined,
      },
    };

    const logId = await this.insertLog({
      company_id: event.company_id,
      pixel_id: pixel.pixel_id,
      event_name: "Lead",
      event_time: new Date(event.occurred_at).toISOString(),
      event_payload: payload,
      source_event: event.type,
      source_id: leadId,
    });

    if (logId) await this.redis.rpush(QUEUE_PENDING, logId);
  }

  async handleLeadQualified(event: LeadQualifiedEvent): Promise<void> {
    const leadId = event.payload.lead_id;
    const lead = await this.loadLead(event.company_id, leadId);
    if (!lead?.pixel_config_id) return;

    const pixel = await this.loadPixel(event.company_id, lead.pixel_config_id);
    if (!pixel) return;

    const eventTime = Math.floor(new Date(event.occurred_at).getTime() / 1000);
    const userData = this.buildUserData(lead);

    const payload = {
      event_id: `${event.type}:${leadId}:CompleteRegistration`,
      event_name: "CompleteRegistration",
      event_time: eventTime,
      action_source: "chat",
      event_source_url: pixel.domain ? pixel.domain.replace(/\/$/, "") : undefined,
      user_data: userData,
      custom_data: {
        value: event.payload.score,
      },
    };

    const logId = await this.insertLog({
      company_id: event.company_id,
      pixel_id: pixel.pixel_id,
      event_name: "CompleteRegistration",
      event_time: new Date(event.occurred_at).toISOString(),
      event_payload: payload,
      source_event: event.type,
      source_id: leadId,
    });

    if (logId) await this.redis.rpush(QUEUE_PENDING, logId);
  }

  async handleContractSigned(event: ContractSignedEvent): Promise<void> {
    const contractId = event.payload.contract_id;
    const contract = await this.loadContract(event.company_id, contractId);
    if (!contract?.lead_id) return;

    const lead = await this.loadLead(event.company_id, contract.lead_id);
    if (!lead?.pixel_config_id) return;

    const pixel = await this.loadPixel(event.company_id, lead.pixel_config_id);
    if (!pixel) return;

    const template = await this.loadTemplate(contract.template_id);
    const value = typeof event.payload.value === "number" ? event.payload.value : contract.value ?? undefined;
    const currency = event.payload.currency ?? "BRL";

    const eventTime = Math.floor(new Date(event.occurred_at).getTime() / 1000);
    const userData = this.buildUserData(lead);
    const payload = {
      event_id: `${event.type}:${contractId}:Purchase`,
      event_name: "Purchase",
      event_time: eventTime,
      action_source: "chat",
      event_source_url: pixel.domain ? pixel.domain.replace(/\/$/, "") : undefined,
      user_data: userData,
      custom_data: {
        value,
        currency,
        content_name: template?.name ?? undefined,
      },
    };

    const logId = await this.insertLog({
      company_id: event.company_id,
      pixel_id: pixel.pixel_id,
      event_name: "Purchase",
      event_time: new Date(event.occurred_at).toISOString(),
      event_payload: payload,
      source_event: event.type,
      source_id: contractId,
    });

    if (logId) await this.redis.rpush(QUEUE_PENDING, logId);
  }

  private buildUserData(lead: LeadRow) {
    const userData: Record<string, unknown> = {};

    if (lead.email) userData.em = [this.hashing.hashEmail(lead.email)];
    if (lead.phone) userData.ph = [this.hashing.hashPhone(lead.phone)];

    if (lead.name) {
      const name = this.hashing.hashName(lead.name);
      if (name.first) userData.fn = name.first;
      if (name.last) userData.ln = name.last;
    }

    const externalSource = lead.contact_fingerprint || lead.id;
    userData.external_id = this.hashing.hashExternalId(externalSource);

    const fbData = lead.fb_data ?? {};
    const fbc = typeof fbData["fbc"] === "string" ? fbData["fbc"] : undefined;
    const fbp = typeof fbData["fbp"] === "string" ? fbData["fbp"] : undefined;
    if (fbc) userData.fbc = fbc;
    if (fbp) userData.fbp = fbp;

    return userData;
  }

  private async loadLead(companyId: string, leadId: string): Promise<LeadRow | null> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("leads")
      .select("id, company_id, phone, email, name, pixel_config_id, utm_campaign, utm_source, utm_medium, fb_data, contact_fingerprint")
      .eq("company_id", companyId)
      .eq("id", leadId)
      .maybeSingle();
    if (error) {
      this.logger.warn("capi.lead.fetch_failed", { company_id: companyId, lead_id: leadId, error });
      return null;
    }
    return (data ?? null) as unknown as LeadRow | null;
  }

  private async loadContract(companyId: string, contractId: string): Promise<ContractRow | null> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("contracts")
      .select("id, company_id, lead_id, template_id, value")
      .eq("company_id", companyId)
      .eq("id", contractId)
      .maybeSingle();
    if (error) {
      this.logger.warn("capi.contract.fetch_failed", { company_id: companyId, contract_id: contractId, error });
      return null;
    }
    return (data ?? null) as unknown as ContractRow | null;
  }

  private async loadTemplate(templateId: string): Promise<TemplateRow | null> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("contract_templates")
      .select("id, name")
      .eq("id", templateId)
      .maybeSingle();
    if (error) return null;
    return (data ?? null) as unknown as TemplateRow | null;
  }

  private async loadPixel(companyId: string, pixelConfigId: string): Promise<PixelConfigRow | null> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("pixel_configs")
      .select("id, company_id, pixel_id, is_active, domain")
      .eq("company_id", companyId)
      .eq("id", pixelConfigId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) {
      this.logger.warn("capi.pixel.fetch_failed", { company_id: companyId, pixel_config_id: pixelConfigId, error });
      return null;
    }
    return (data ?? null) as unknown as PixelConfigRow | null;
  }

  private async insertLog(row: {
    company_id: string;
    pixel_id: string;
    event_name: string;
    event_time: string;
    event_payload: unknown;
    source_event: string;
    source_id: string;
  }): Promise<string | null> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("capi_event_logs")
      .insert({
        company_id: row.company_id,
        pixel_id: row.pixel_id,
        event_name: row.event_name,
        event_time: row.event_time,
        event_payload: row.event_payload,
        source_event: row.source_event,
        source_id: row.source_id,
      })
      .select("id")
      .single();

    if (!error) {
      return (data as any)?.id ?? null;
    }

    const maybeConflict =
      (error as any)?.code === "23505" || String((error as any)?.message ?? "").toLowerCase().includes("duplicate");
    if (!maybeConflict) {
      this.logger.warn("capi.log.insert_failed", { company_id: row.company_id, pixel_id: row.pixel_id, error });
      return null;
    }

    const { data: existing, error: existingErr } = await this.admin()
      .schema("core")
      .from("capi_event_logs")
      .select("id, status")
      .eq("company_id", row.company_id)
      .eq("source_event", row.source_event)
      .eq("source_id", row.source_id)
      .eq("event_name", row.event_name)
      .maybeSingle();
    if (existingErr) return null;
    const status = (existing as any)?.status as string | undefined;
    if (!status || !["pending", "retrying"].includes(status)) return null;
    return (existing as any)?.id ?? null;
  }
}
