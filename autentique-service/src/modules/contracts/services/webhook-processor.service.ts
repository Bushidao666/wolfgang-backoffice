import { Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";

import { ValidationError } from "@wolfgang/contracts";
import { RedisChannels } from "@wolfgang/contracts";

import { AutentiqueClient, type AutentiqueCredentials } from "../../../infrastructure/autentique/autentique.client";
import { EventBusService } from "../../../infrastructure/messaging/event-bus.service";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import { LoggerService } from "../../../common/logging/logger.service";
import { buildContractSignedEvent } from "../events/contract-signed.event";
import { AutentiqueIntegrationService } from "./autentique-integration.service";

function safeString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function computeHmacSha256(secret: string, payload: Buffer): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function secureCompareHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a.trim().toLowerCase(), "utf8");
  const bBuf = Buffer.from(b.trim().toLowerCase(), "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

@Injectable()
export class WebhookProcessorService {
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

  async processAutentiqueWebhookForCredentialSet(args: {
    credential_set_id: string;
    raw_body: Buffer | undefined;
    payload: unknown;
    signature?: string | undefined;
    request_id?: string | undefined;
  }) {
    const resolved = await this.integrations.resolveForCredentialSetId(args.credential_set_id);
    await this.processAutentiqueWebhookWithCredentials({
      ...args,
      autentique: { api_key: resolved.api_key, base_url: resolved.base_url, webhook_secret: resolved.webhook_secret },
    });
  }

  async processAutentiqueWebhookForCompany(args: {
    company_id: string;
    raw_body: Buffer | undefined;
    payload: unknown;
    signature?: string | undefined;
    request_id?: string | undefined;
  }) {
    const resolved = await this.integrations.resolveForCompany(args.company_id);
    await this.processAutentiqueWebhookWithCredentials({
      ...args,
      autentique: { api_key: resolved.api_key, base_url: resolved.base_url, webhook_secret: resolved.webhook_secret },
    });
  }

  async processAutentiqueWebhook(args: {
    raw_body: Buffer | undefined;
    payload: unknown;
    signature?: string | undefined;
    request_id?: string | undefined;
  }) {
    const secret = (process.env.AUTENTIQUE_WEBHOOK_SECRET ?? "").trim();
    const apiKey = (process.env.AUTENTIQUE_API_KEY ?? "").trim();
    const baseUrl = (process.env.AUTENTIQUE_BASE_URL ?? "https://api.autentique.com.br").trim();

    if (!secret) {
      throw new ValidationError("AUTENTIQUE_WEBHOOK_SECRET is required to verify webhook signatures");
    }
    if (!apiKey) {
      throw new ValidationError("AUTENTIQUE_API_KEY is required to process Autentique webhooks (legacy endpoint)");
    }

    await this.processAutentiqueWebhookWithCredentials({
      ...args,
      autentique: { api_key: apiKey, base_url: baseUrl, webhook_secret: secret },
    });
  }

  private async processAutentiqueWebhookWithCredentials(args: {
    raw_body: Buffer | undefined;
    payload: unknown;
    signature?: string | undefined;
    request_id?: string | undefined;
    autentique: { api_key: string; base_url: string; webhook_secret: string };
  }) {
    const signature = safeString(args.signature);
    if (!signature) throw new ValidationError("Missing X-Autentique-Signature");

    const rawBody = args.raw_body ?? Buffer.from(JSON.stringify(args.payload));
    const calculated = computeHmacSha256(args.autentique.webhook_secret, rawBody);
    if (!secureCompareHex(calculated, signature)) {
      const fallback = computeHmacSha256(args.autentique.webhook_secret, Buffer.from(JSON.stringify(args.payload)));
      if (!secureCompareHex(fallback, signature)) {
        throw new ValidationError("Invalid webhook signature");
      }
    }

    const body = (args.payload ?? {}) as any;
    const eventType = safeString(body?.event?.type);
    const eventData = body?.event?.data ?? body?.event?.data?.object ?? body?.event?.data;

    if (!eventType) {
      this.logger.warn("webhook.ignored_missing_type", { request_id: args.request_id });
      return;
    }

    if (eventType === "signature.accepted") {
      const documentId = safeString(eventData?.document);
      const signedAt = safeString(eventData?.signed) ?? new Date().toISOString();
      if (!documentId) {
        this.logger.warn("webhook.signature_missing_document", { request_id: args.request_id });
        return;
      }
      await this.markSigned({
        document_id: documentId,
        signed_at: signedAt,
        credentials: { api_key: args.autentique.api_key, base_url: args.autentique.base_url },
      });
      return;
    }

    if (eventType === "document.finished") {
      const documentId = safeString(eventData?.object?.id) ?? safeString(eventData?.id) ?? safeString(eventData?.document);
      if (!documentId) {
        this.logger.warn("webhook.document_missing_id", { request_id: args.request_id });
        return;
      }
      await this.markSigned({
        document_id: documentId,
        signed_at: new Date().toISOString(),
        credentials: { api_key: args.autentique.api_key, base_url: args.autentique.base_url },
      });
      return;
    }

    // Best-effort updates for cancellation/rejection.
    if (eventType === "signature.rejected" || eventType === "document.deleted") {
      const documentId = safeString(eventData?.document) ?? safeString(eventData?.object?.id) ?? safeString(eventData?.id);
      if (!documentId) return;
      await this.updateContractStatusByDocumentId(documentId, { status: "canceled" });
      return;
    }

    this.logger.debug("webhook.ignored", { request_id: args.request_id, event_type: eventType });
  }

  private async markSigned(args: { document_id: string; signed_at: string; credentials: AutentiqueCredentials }) {
    const { data: contract, error } = await this.admin()
      .schema("core")
      .from("contracts")
      .select("*")
      .eq("autentique_id", args.document_id)
      .maybeSingle();
    if (error) throw new ValidationError("Failed to load contract by autentique_id", { error });
    if (!contract) return;

    if (String((contract as any).status) === "signed") return;

    const contractId = String((contract as any).id);
    const companyId = String((contract as any).company_id);
    const dealIndexId = (contract as any).deal_index_id ? String((contract as any).deal_index_id) : null;

    let resolvedCredentials = args.credentials;
    const credentialSetId = (contract as any).autentique_credential_set_id ? String((contract as any).autentique_credential_set_id) : null;
    if (credentialSetId) {
      try {
        const set = await this.integrations.resolveForCredentialSetId(credentialSetId);
        resolvedCredentials = { api_key: set.api_key, base_url: set.base_url };
      } catch {
        resolvedCredentials = args.credentials;
      }
    }

    let signedFilePath: string | null = null;
    try {
      const doc = (await this.autentique.getDocument(resolvedCredentials, args.document_id)) as any;
      const signedUrl = safeString(doc?.files?.signed) ?? safeString(doc?.files?.pades) ?? null;
      if (signedUrl && dealIndexId) {
        const buf = await this.autentique.downloadSignedFile(resolvedCredentials, signedUrl);
        signedFilePath = `${companyId}/${dealIndexId}/${contractId}/signed.pdf`;
        const { error: uploadError } = await this.admin().storage.from("deal_files").upload(signedFilePath, buf, {
          contentType: "application/pdf",
          upsert: true,
        });
        if (uploadError) {
          signedFilePath = null;
        }
      }
    } catch {
      signedFilePath = null;
    }

    const contractData = (contract as any).contract_data && typeof (contract as any).contract_data === "object" ? (contract as any).contract_data : {};
    const mergedData = signedFilePath ? { ...contractData, signed_file_path: signedFilePath } : contractData;

    const { error: updateError } = await this.admin()
      .schema("core")
      .from("contracts")
      .update({ status: "signed", signed_at: args.signed_at, contract_data: mergedData })
      .eq("id", contractId)
      .eq("company_id", companyId);
    if (updateError) throw new ValidationError("Failed to update contract status", { error: updateError });

    if (dealIndexId) {
      const { data: idx, error: idxError } = await this.admin()
        .schema("core")
        .from("deals_index")
        .select("schema_name, local_deal_id")
        .eq("id", dealIndexId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (!idxError && idx?.schema_name && idx?.local_deal_id) {
        const dealUpdate: Record<string, unknown> = { deal_status: "contrato_assinado" };
        if (signedFilePath) dealUpdate.deal_copia_contrato_assinado = signedFilePath;
        await this.admin().schema(String(idx.schema_name)).from("deals").update(dealUpdate).eq("id", String(idx.local_deal_id)).eq("company_id", companyId);
      }
    }

    if (dealIndexId) {
      await this.events.publish(
        RedisChannels.CONTRACT_SIGNED,
        buildContractSignedEvent({
          company_id: companyId,
          contract_id: contractId,
          deal_id: dealIndexId,
          signed_at: args.signed_at,
          value: (contract as any).value ?? undefined,
          currency: "BRL",
          correlation_id: contractId,
        }),
      );
    }

    this.logger.log("contract.signed", { company_id: companyId, contract_id: contractId, deal_index_id: dealIndexId });
  }

  private async updateContractStatusByDocumentId(documentId: string, patch: { status: string }) {
    const { data: contract, error } = await this.admin().schema("core").from("contracts").select("id, company_id, status").eq("autentique_id", documentId).maybeSingle();
    if (error) throw new ValidationError("Failed to load contract", { error });
    if (!contract) return;
    if (String((contract as any).status) === patch.status) return;

    const { error: updateError } = await this.admin().schema("core").from("contracts").update({ status: patch.status }).eq("id", contract.id).eq("company_id", contract.company_id);
    if (updateError) throw new ValidationError("Failed to update contract status", { error: updateError });
  }
}
