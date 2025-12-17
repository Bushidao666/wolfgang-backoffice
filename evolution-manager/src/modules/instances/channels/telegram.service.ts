import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { TelegramConfig } from "../../../config/telegram.config";

type TelegramApiResponse<T> = { ok: boolean; result?: T; description?: string };

type TelegramWebhookInfo = {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
};

type TelegramFile = { file_id: string; file_unique_id: string; file_path?: string };

export type TelegramNormalizedInbound = {
  from: string;
  lead_external_id: string;
  body: string | null;
  media: { type: "image" | "audio" | "document"; url: string; mime_type: string } | null;
  raw: Record<string, unknown>;
  correlation_id: string;
};

function stripPrefix(value: string, prefix: string) {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

@Injectable()
export class TelegramService {
  private readonly cfg: TelegramConfig;

  constructor(private readonly configService: ConfigService) {
    this.cfg = this.configService.get<TelegramConfig>("telegram") ?? {
      apiBaseUrl: process.env.TELEGRAM_API_BASE_URL ?? "https://api.telegram.org",
      webhookBaseUrl: process.env.TELEGRAM_WEBHOOK_BASE_URL,
      webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET,
    };
  }

  private apiBase(token: string) {
    const base = this.cfg.apiBaseUrl.replace(/\/$/, "");
    return `${base}/bot${token}`;
  }

  private fileBase(token: string) {
    const base = this.cfg.apiBaseUrl.replace(/\/$/, "");
    return `${base}/file/bot${token}`;
  }

  private async call<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
    const url = `${this.apiBase(token)}/${method}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
    });
    const json = (await res.json().catch(() => ({}))) as TelegramApiResponse<T>;
    if (!res.ok || !json.ok) {
      throw new ServiceUnavailableException(`Telegram API error: ${json.description ?? res.statusText}`);
    }
    return json.result as T;
  }

  async setWebhook(token: string, instanceId: string) {
    const baseUrl = this.cfg.webhookBaseUrl?.trim();
    const secret = this.cfg.webhookSecret?.trim();
    if (!baseUrl) {
      throw new ServiceUnavailableException("TELEGRAM_WEBHOOK_BASE_URL is required to connect Telegram instances");
    }
    if (!secret) {
      throw new ServiceUnavailableException("TELEGRAM_WEBHOOK_SECRET (or WEBHOOK_SECRET) is required to secure Telegram webhooks");
    }

    const webhookUrl = `${baseUrl.replace(/\/$/, "")}/webhooks/telegram/${encodeURIComponent(instanceId)}`;
    await this.call(token, "setWebhook", {
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message", "edited_message"],
    });
  }

  async deleteWebhook(token: string) {
    await this.call(token, "deleteWebhook", { drop_pending_updates: true });
  }

  async getWebhookInfo(token: string): Promise<TelegramWebhookInfo> {
    const url = `${this.apiBase(token)}/getWebhookInfo`;
    const res = await fetch(url);
    const json = (await res.json().catch(() => ({}))) as TelegramApiResponse<TelegramWebhookInfo>;
    if (!res.ok || !json.ok) {
      throw new ServiceUnavailableException(`Telegram API error: ${json.description ?? res.statusText}`);
    }
    return json.result as TelegramWebhookInfo;
  }

  async sendText(token: string, to: string, text: string): Promise<void> {
    const chatId = stripPrefix(to, "telegram:");
    await this.call(token, "sendMessage", {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    });
  }

  async resolveFileUrl(token: string, fileId: string): Promise<string> {
    const file = await this.call<TelegramFile>(token, "getFile", { file_id: fileId });
    if (!file.file_path) {
      throw new ServiceUnavailableException("Telegram file_path missing");
    }
    return `${this.fileBase(token)}/${file.file_path}`;
  }

  async normalizeInbound(args: { token: string; update: Record<string, unknown> }): Promise<TelegramNormalizedInbound | null> {
    const updateId = String(args.update["update_id"] ?? "");
    const message = (args.update["message"] ?? args.update["edited_message"] ?? null) as Record<string, unknown> | null;
    if (!message) return null;

    const chat = (message["chat"] ?? {}) as Record<string, unknown>;
    const chatId = chat["id"] != null ? String(chat["id"]) : "";
    if (!chatId) return null;

    const from = `telegram:${chatId}`;
    const messageId = message["message_id"] != null ? String(message["message_id"]) : "";

    const text = typeof message["text"] === "string" ? message["text"] : null;

    let media: TelegramNormalizedInbound["media"] = null;
    const photo = (message["photo"] ?? null) as Array<Record<string, unknown>> | null;
    const document = (message["document"] ?? null) as Record<string, unknown> | null;
    const voice = (message["voice"] ?? null) as Record<string, unknown> | null;

    if (Array.isArray(photo) && photo.length) {
      const largest = photo[photo.length - 1];
      const fileId = largest?.file_id ? String(largest.file_id) : "";
      if (fileId) {
        const url = await this.resolveFileUrl(args.token, fileId);
        media = { type: "image", url, mime_type: "image/jpeg" };
      }
    } else if (document?.file_id) {
      const fileId = String(document.file_id);
      const url = await this.resolveFileUrl(args.token, fileId);
      const mime = document.mime_type ? String(document.mime_type) : "application/octet-stream";
      media = { type: "document", url, mime_type: mime };
    } else if (voice?.file_id) {
      const fileId = String(voice.file_id);
      const url = await this.resolveFileUrl(args.token, fileId);
      media = { type: "audio", url, mime_type: "audio/ogg" };
    }

    const correlation_id = messageId || updateId || chatId;

    return {
      from,
      lead_external_id: from,
      body: text,
      media,
      raw: { provider: "telegram", update: args.update },
      correlation_id,
    };
  }
}

