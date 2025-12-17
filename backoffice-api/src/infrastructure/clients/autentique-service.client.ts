import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { ValidationError } from "@wolfgang/contracts";

import type { ServicesConfig } from "../../config/services.config";

type CreateAutentiqueContractRequest = {
  company_id: string;
  template_id: string;
  schema_name?: string;
  local_deal_id?: string;
  deal_index_id?: string;
  value?: number;
  currency?: string;
  signer_name?: string;
  signer_email?: string;
  signer_phone?: string;
  contract_data?: Record<string, unknown>;
};

@Injectable()
export class AutentiqueServiceClient {
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const cfg = this.configService.get<ServicesConfig>("services");
    this.baseUrl = cfg?.autentiqueServiceUrl ?? process.env.AUTENTIQUE_SERVICE_URL ?? "http://127.0.0.1:4002";
  }

  async createContract(payload: CreateAutentiqueContractRequest, opts?: { requestId?: string; correlationId?: string }) {
    const url = `${this.baseUrl.replace(/\/$/, "")}/contracts`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(opts?.requestId ? { "x-request-id": opts.requestId } : {}),
          ...(opts?.correlationId ? { "x-correlation-id": opts.correlationId } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as unknown) : null;
      if (!res.ok) {
        throw new ValidationError("Autentique service error", { status: res.status, body: data });
      }
      return data as any;
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError("Failed to call Autentique service", { error: err instanceof Error ? err.message : String(err) });
    } finally {
      clearTimeout(timeout);
    }
  }
}
