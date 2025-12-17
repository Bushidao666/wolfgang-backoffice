import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { MessageSentEventSchema, RedisChannels } from "@wolfgang/contracts";

import { RedisService } from "../../../infrastructure/redis/redis.service";
import { InstagramService } from "../../instances/channels/instagram.service";
import { TelegramService } from "../../instances/channels/telegram.service";
import { EvolutionApiService } from "../../instances/services/evolution-api.service";
import { InstancesService } from "../../instances/services/instances.service";

@Injectable()
export class MessagesSubscriber implements OnModuleInit, OnModuleDestroy {
  private unsubscribe?: () => Promise<void>;

  constructor(
    private readonly redis: RedisService,
    private readonly instances: InstancesService,
    private readonly evolution: EvolutionApiService,
    private readonly telegram: TelegramService,
    private readonly instagram: InstagramService,
  ) {}

  async onModuleInit() {
    this.unsubscribe = await this.redis.subscribe(RedisChannels.MESSAGE_SENT, async (raw) => {
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        return;
      }

      const parsed = MessageSentEventSchema.safeParse(json);
      if (!parsed.success) return;
      const event = parsed.data;

      const instance = await this.instances.getById(event.payload.instance_id);

      for (const msg of event.payload.messages) {
        if (msg.type === "text") {
          if (instance.channel_type === "whatsapp") {
            await this.evolution.sendText(instance.instance_name, event.payload.to, msg.text);
          } else if (instance.channel_type === "telegram") {
            if (!instance.telegram_bot_token) continue;
            await this.telegram.sendText(instance.telegram_bot_token, event.payload.to, msg.text);
          } else if (instance.channel_type === "instagram") {
            await this.instagram.sendText(instance.instance_name, event.payload.to, msg.text);
          }
        }
      }
    });
  }

  async onModuleDestroy() {
    if (this.unsubscribe) {
      await this.unsubscribe();
    }
  }
}
