import { Body, Controller, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { EvolutionWebhookSchema, type EvolutionWebhook } from "../dto/evolution-event.dto";
import { WebhooksService } from "../services/webhooks.service";

@ApiTags("webhooks")
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @ApiOkResponse({ description: "Webhook processed" })
  @Post("evolution")
  async evolutionWebhook(
    @Body() body: unknown,
    @Headers("x-webhook-secret") headerSecret?: string,
  ) {
    const secret = process.env.WEBHOOK_SECRET ?? "";
    if (!secret || headerSecret !== secret) {
      throw new UnauthorizedException("Invalid webhook secret");
    }

    const parsed = EvolutionWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return;
    }

    await this.webhooks.handle(parsed.data as EvolutionWebhook);
  }
}

