import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { MessageSentEventSchema, RedisChannels } from "@wolfgang/contracts";

import { LoggerService } from "../../../common/logging/logger.service";
import { RedisService } from "../../../infrastructure/redis/redis.service";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import { InstagramService } from "../../instances/channels/instagram.service";
import { TelegramService } from "../../instances/channels/telegram.service";
import { EvolutionApiService } from "../../instances/services/evolution-api.service";
import { InstancesService } from "../../instances/services/instances.service";

const MESSAGE_SENT_DEDUPE_TTL_S = 7 * 24 * 3600;

@Injectable()
export class MessagesSubscriber implements OnModuleInit, OnModuleDestroy {
  private unsubscribe?: () => Promise<void>;

  constructor(
    private readonly redis: RedisService,
    private readonly instances: InstancesService,
    private readonly evolution: EvolutionApiService,
    private readonly telegram: TelegramService,
    private readonly instagram: InstagramService,
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async onModuleInit() {
    this.unsubscribe = await this.redis.subscribe(RedisChannels.MESSAGE_SENT, async (raw) => {
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        this.logger.warn("message_sent.invalid_json");
        return;
      }

      const parsed = MessageSentEventSchema.safeParse(json);
      if (!parsed.success) {
        this.logger.warn("message_sent.invalid_envelope", { issues: parsed.error.issues });
        return;
      }
      const event = parsed.data;

      const instance = await this.instances.getByIdWithSecrets(event.payload.instance_id);
      if (!instance) {
        this.logger.warn("message_sent.instance_not_found", {
          instance_id: event.payload.instance_id,
          correlation_id: event.correlation_id,
          event_id: event.id,
        });
        return;
      }

      for (const [idx, msg] of event.payload.messages.entries()) {
        if (instance.channel_type === "telegram" && !instance.telegram_bot_token_resolved) {
          this.logger.warn("message_sent.telegram_missing_token", {
            instance_id: instance.id,
            correlation_id: event.correlation_id,
            event_id: event.id,
          });
          continue;
        }

        const rawChunkIndex = (event.payload.raw as any)?.chunk_index as unknown;
        const dedupeIndex =
          typeof rawChunkIndex === "number" && Number.isInteger(rawChunkIndex) && rawChunkIndex >= 0
            ? rawChunkIndex
            : typeof rawChunkIndex === "string" && rawChunkIndex.trim() !== "" && Number.isFinite(Number(rawChunkIndex)) && Number(rawChunkIndex) >= 0
              ? Number(rawChunkIndex)
              : idx;

        const dedupeKey = `idempotency:message.sent:${event.company_id}:${event.correlation_id}:${dedupeIndex}`;
        const claimed = await this.redis.setNx(dedupeKey, event.id, MESSAGE_SENT_DEDUPE_TTL_S);
        if (!claimed) {
          this.logger.debug("message_sent.duplicate", {
            correlation_id: event.correlation_id,
            event_id: event.id,
            chunk_index: dedupeIndex,
          });
          continue;
        }

        if (instance.channel_type === "whatsapp") {
          try {
            if (msg.type === "text") {
              await this.evolution.sendText(instance.company_id, instance.instance_name, event.payload.to, msg.text);
            } else {
              const resolved = await this.resolveMediaMessage(instance.company_id, msg);
              if (!resolved) {
                throw new Error("Failed to resolve media message");
              }
              if (resolved.type === "audio") {
                await this.evolution.sendWhatsAppAudio(instance.company_id, instance.instance_name, event.payload.to, resolved.url);
              } else {
                await this.evolution.sendMedia(
                  instance.company_id,
                  instance.instance_name,
                  event.payload.to,
                  resolved.url,
                  resolved.mime_type,
                  resolved.caption,
                );
              }
            }
          } catch (err) {
            await this.redis.del(dedupeKey);
            this.logger.error("message_sent.whatsapp_send_failed", {
              correlation_id: event.correlation_id,
              event_id: event.id,
              chunk_index: dedupeIndex,
              error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
            });
          }
        } else if (instance.channel_type === "telegram") {
          try {
            if (msg.type !== "text") {
              this.logger.warn("message_sent.telegram_media_not_supported", {
                correlation_id: event.correlation_id,
                event_id: event.id,
                chunk_index: dedupeIndex,
                media_type: msg.type,
              });
              continue;
            }
            await this.telegram.sendText(instance.telegram_bot_token_resolved!, event.payload.to, msg.text);
          } catch (err) {
            await this.redis.del(dedupeKey);
            this.logger.error("message_sent.telegram_send_failed", {
              correlation_id: event.correlation_id,
              event_id: event.id,
              chunk_index: dedupeIndex,
              error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
            });
          }
        } else if (instance.channel_type === "instagram") {
          try {
            if (msg.type !== "text") {
              this.logger.warn("message_sent.instagram_media_not_supported", {
                correlation_id: event.correlation_id,
                event_id: event.id,
                chunk_index: dedupeIndex,
                media_type: msg.type,
              });
              continue;
            }
            await this.instagram.sendText(instance.company_id, instance.instance_name, event.payload.to, msg.text);
          } catch (err) {
            await this.redis.del(dedupeKey);
            this.logger.error("message_sent.instagram_send_failed", {
              correlation_id: event.correlation_id,
              event_id: event.id,
              chunk_index: dedupeIndex,
              error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
            });
          }
        } else {
          await this.redis.del(dedupeKey);
          this.logger.warn("message_sent.unsupported_channel_type", {
            channel_type: instance.channel_type,
            correlation_id: event.correlation_id,
            event_id: event.id,
            chunk_index: dedupeIndex,
          });
        }
      }
    });
  }

  private async resolveMediaMessage(
    companyId: string,
    msg: { type: "image" | "video" | "audio" | "document"; asset_id?: string; url?: string; mime_type?: string; caption?: string },
  ): Promise<{ type: "image" | "video" | "audio" | "document"; url: string; mime_type: string; caption?: string } | null> {
    if (msg.asset_id) {
      const { data, error } = await this.admin()
        .schema("core")
        .from("media_assets")
        .select("bucket,file_path,mime_type,media_type")
        .eq("company_id", companyId)
        .eq("id", msg.asset_id)
        .maybeSingle();
      if (error) {
        this.logger.error("message_sent.media_asset_load_failed", { error, asset_id: msg.asset_id });
        return null;
      }
      if (!data?.file_path) {
        this.logger.warn("message_sent.media_asset_not_found", { asset_id: msg.asset_id });
        return null;
      }

      const bucket = (data as any).bucket || "media_assets";
      const filePath = String((data as any).file_path);
      const mimeType = String((data as any).mime_type || msg.mime_type || "application/octet-stream");
      const type = (data as any).media_type || msg.type;

      const { data: signed, error: signedError } = await this.admin().storage.from(bucket).createSignedUrl(filePath, 600);
      if (signedError || !signed?.signedUrl) {
        this.logger.error("message_sent.media_signed_url_failed", { error: signedError, asset_id: msg.asset_id });
        return null;
      }

      return { type, url: signed.signedUrl, mime_type: mimeType, caption: msg.caption };
    }

    if (!msg.url || !msg.mime_type) return null;
    return { type: msg.type, url: msg.url, mime_type: msg.mime_type, caption: msg.caption };
  }

  async onModuleDestroy() {
    if (this.unsubscribe) {
      await this.unsubscribe();
    }
  }
}
