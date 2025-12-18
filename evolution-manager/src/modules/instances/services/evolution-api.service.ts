import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { resolveCompanyIntegration } from "@wolfgang/integrations";

import type { EvolutionConfig } from "../../../config/evolution.config";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";

type EvolutionResponse<T> = T & Record<string, unknown>;

function withTrailingSlash(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

@Injectable()
export class EvolutionApiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  private get cfg(): EvolutionConfig {
    return (this.configService.get<EvolutionConfig>("evolution") ?? {
      apiUrl: process.env.EVOLUTION_API_URL ?? "",
      apiKey: process.env.EVOLUTION_API_KEY ?? "",
      webhookSecret: process.env.WEBHOOK_SECRET ?? "",
    }) satisfies EvolutionConfig;
  }

  private admin() {
    return this.supabase.getAdminClient();
  }

  private async resolveCredentials(companyId: string): Promise<{ apiUrl: string; apiKey: string }> {
    try {
      const resolved = await resolveCompanyIntegration({ supabaseAdmin: this.admin(), companyId, provider: "evolution" });
      if (resolved) {
        const apiKey = typeof resolved.secrets["api_key"] === "string" ? String(resolved.secrets["api_key"]) : "";
        const apiUrl = typeof resolved.config["api_url"] === "string" ? String(resolved.config["api_url"]) : "";
        if (apiKey && apiUrl) return { apiUrl, apiKey };
      }
    } catch {
      // fall back to env
    }

    const apiUrl = this.cfg.apiUrl?.trim();
    const apiKey = this.cfg.apiKey?.trim();
    if (!apiUrl || !apiKey) {
      throw new ServiceUnavailableException("Evolution API not configured (EVOLUTION_API_URL / EVOLUTION_API_KEY)");
    }
    return { apiUrl, apiKey };
  }

  private async request<T>(
    companyId: string,
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<EvolutionResponse<T>> {
    const { apiUrl, apiKey } = await this.resolveCredentials(companyId);

    const url = `${withTrailingSlash(apiUrl)}${path.startsWith("/") ? "" : "/"}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        apikey: apiKey,
        authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ServiceUnavailableException(`Evolution API error (${res.status}): ${text || res.statusText}`);
    }

    const json = (await res.json().catch(() => ({}))) as EvolutionResponse<T>;
    return json;
  }

  async createInstance(companyId: string, instanceName: string): Promise<{ instanceName: string }> {
    await this.request(companyId, "POST", "/instance/create", {
      instanceName,
      instance_name: instanceName,
    });
    return { instanceName };
  }

  async deleteInstance(companyId: string, instanceName: string): Promise<void> {
    await this.request(companyId, "DELETE", `/instance/delete/${encodeURIComponent(instanceName)}`);
  }

  async connect(companyId: string, instanceName: string): Promise<{ qrcode: string | null }> {
    const data = await this.request<Record<string, unknown>>(companyId, "POST", `/instance/connect/${encodeURIComponent(instanceName)}`);
    const qrcode = (data["qrcode"] as string | undefined) ?? (data["base64"] as string | undefined) ?? null;
    return { qrcode };
  }

  async disconnect(companyId: string, instanceName: string): Promise<void> {
    await this.request(companyId, "DELETE", `/instance/logout/${encodeURIComponent(instanceName)}`);
  }

  async getStatus(companyId: string, instanceName: string): Promise<{ state: string; raw: Record<string, unknown> }> {
    const data = await this.request<Record<string, unknown>>(companyId, "GET", `/instance/connectionState/${encodeURIComponent(instanceName)}`);
    const state = String((data["state"] as string | undefined) ?? (data["instance"] as string | undefined) ?? "unknown");
    return { state, raw: data };
  }

  async getQrCode(companyId: string, instanceName: string): Promise<{ qrcode: string | null; raw: Record<string, unknown> }> {
    const data = await this.request<Record<string, unknown>>(companyId, "GET", `/instance/connect/${encodeURIComponent(instanceName)}`);
    const qrcode = (data["qrcode"] as string | undefined) ?? (data["base64"] as string | undefined) ?? null;
    return { qrcode, raw: data };
  }

  async sendText(companyId: string, instanceName: string, to: string, text: string): Promise<{ messageId?: string }> {
    const data = await this.request<Record<string, unknown>>(companyId, "POST", `/message/sendText/${encodeURIComponent(instanceName)}`, {
      number: to,
      to,
      text,
      message: text,
      textMessage: { text },
    });
    const messageId = (data["messageId"] as string | undefined) ?? (data["id"] as string | undefined);
    return { messageId };
  }

  async sendMedia(
    companyId: string,
    instanceName: string,
    to: string,
    mediaUrl: string,
    mimeType: string,
    caption?: string,
  ): Promise<{ messageId?: string }> {
    const data = await this.request<Record<string, unknown>>(
      companyId,
      "POST",
      `/message/sendMedia/${encodeURIComponent(instanceName)}`,
      {
        number: to,
        to,
        mediatype: mimeType,
        mimetype: mimeType,
        media: mediaUrl,
        url: mediaUrl,
        caption,
      },
    );
    const messageId = (data["messageId"] as string | undefined) ?? (data["id"] as string | undefined);
    return { messageId };
  }

  async sendWhatsAppAudio(companyId: string, instanceName: string, to: string, audioUrl: string): Promise<{ messageId?: string }> {
    const data = await this.request<Record<string, unknown>>(
      companyId,
      "POST",
      `/message/sendWhatsAppAudio/${encodeURIComponent(instanceName)}`,
      {
        number: to,
        to,
        audio: audioUrl,
        url: audioUrl,
      },
    );
    const messageId = (data["messageId"] as string | undefined) ?? (data["id"] as string | undefined);
    return { messageId };
  }
}
