import { Body, Controller, Headers, Param, Post, UnauthorizedException } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { InstancesService } from "../../instances/services/instances.service";
import { TelegramService } from "../../instances/channels/telegram.service";
import { EventPublisherService } from "../services/event-publisher.service";

@ApiTags("webhooks")
@Controller("webhooks")
export class TelegramWebhooksController {
  constructor(
    private readonly instances: InstancesService,
    private readonly telegram: TelegramService,
    private readonly publisher: EventPublisherService,
  ) {}

  @ApiOkResponse({ description: "Telegram webhook processed" })
  @Post("telegram/:instanceId")
  async telegramWebhook(
    @Param("instanceId") instanceId: string,
    @Body() body: unknown,
    @Headers("x-telegram-bot-api-secret-token") headerSecret?: string,
  ) {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET ?? "";
    if (!expected || headerSecret !== expected) {
      throw new UnauthorizedException("Invalid Telegram webhook secret");
    }

    const instance = await this.instances.getById(instanceId);
    if (instance.channel_type !== "telegram" || !instance.telegram_bot_token) return;

    if (!body || typeof body !== "object") return;

    const normalized = await this.telegram.normalizeInbound({
      token: instance.telegram_bot_token,
      update: body as Record<string, unknown>,
    });
    if (!normalized) return;

    await this.publisher.publishMessageReceived(
      instance.company_id,
      {
        instance_id: instance.id,
        lead_external_id: normalized.lead_external_id,
        from: normalized.from,
        body: normalized.body,
        media: normalized.media,
        raw: normalized.raw,
      },
      normalized.correlation_id,
    );
  }
}

