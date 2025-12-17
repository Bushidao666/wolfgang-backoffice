import { Injectable } from "@nestjs/common";

import { InstancesService } from "../../instances/services/instances.service";
import { EventPublisherService } from "./event-publisher.service";
import type { EvolutionWebhook } from "../dto/evolution-event.dto";

function normalizePhone(remoteJid: string): string {
  return remoteJid.replace(/@.+$/, "");
}

function normalizeSender(channelType: string, remoteJid: string): string {
  const base = normalizePhone(remoteJid);
  if (channelType === "instagram") return `instagram:${base}`;
  return base;
}

@Injectable()
export class WebhooksService {
  constructor(
    private readonly instances: InstancesService,
    private readonly publisher: EventPublisherService,
  ) {}

  async handle(event: EvolutionWebhook): Promise<void> {
    if (event.event === "messages.upsert") {
      await this.handleMessagesUpsert(event);
      return;
    }

    if (event.event === "connection.update") {
      await this.handleConnectionUpdate(event);
    }
  }

  private async handleMessagesUpsert(event: EvolutionWebhook): Promise<void> {
    const instance = await this.instances.getByName(event.instance);
    if (!instance) return;

    const data = (event.data ?? {}) as Record<string, unknown>;
    const key = (data["key"] ?? {}) as Record<string, unknown>;
    const fromMe = Boolean(key["fromMe"]);
    if (fromMe) return;

    const remoteJid = String(key["remoteJid"] ?? "");
    const messageId = String(key["id"] ?? "");
    const msg = (data["message"] ?? {}) as Record<string, unknown>;

    const text = typeof msg["conversation"] === "string" ? msg["conversation"] : undefined;

    let media: { type: "image" | "audio" | "document"; url: string; mime_type: string } | null = null;
    const imageMessage = (msg["imageMessage"] ?? null) as Record<string, unknown> | null;
    const audioMessage = (msg["audioMessage"] ?? null) as Record<string, unknown> | null;
    const documentMessage = (msg["documentMessage"] ?? null) as Record<string, unknown> | null;

    if (imageMessage?.url && imageMessage?.mimetype) {
      media = { type: "image", url: String(imageMessage.url), mime_type: String(imageMessage.mimetype) };
    } else if (audioMessage?.url && audioMessage?.mimetype) {
      media = { type: "audio", url: String(audioMessage.url), mime_type: String(audioMessage.mimetype) };
    } else if (documentMessage?.url && documentMessage?.mimetype) {
      media = { type: "document", url: String(documentMessage.url), mime_type: String(documentMessage.mimetype) };
    }

    const from = normalizeSender(instance.channel_type, remoteJid);
    const payload = {
      instance_id: instance.id,
      lead_external_id: from,
      from,
      body: text ?? null,
      media,
      raw: { message_id: messageId, remoteJid, provider: "evolution", data },
    };

    await this.publisher.publishMessageReceived(instance.company_id, payload, messageId || instance.id);
  }

  private async handleConnectionUpdate(event: EvolutionWebhook): Promise<void> {
    const instance = await this.instances.getByName(event.instance);
    if (!instance) return;

    const data = (event.data ?? {}) as Record<string, unknown>;
    const state = String(data["state"] ?? data["connection"] ?? "unknown");
    const qrcode = typeof data["qrcode"] === "string" ? data["qrcode"] : undefined;

    const normalized = state.toLowerCase();
    const status =
      normalized === "open"
        ? "connected"
        : normalized === "close"
          ? "disconnected"
          : qrcode
            ? "qr_ready"
            : "error";

    await this.instances.applyConnectionUpdate(instance.id, state, data, qrcode);

    await this.publisher.publishInstanceStatus(instance.company_id, {
      instance_id: instance.id,
      company_id: instance.company_id,
      channel: instance.channel_type,
      status: status as any,
      details: { state, qrcode_present: !!qrcode, raw: data },
    }, instance.id);
  }
}
