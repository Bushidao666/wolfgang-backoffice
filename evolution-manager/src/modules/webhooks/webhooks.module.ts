import { Module } from "@nestjs/common";

import { InstancesModule } from "../instances/instances.module";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { WebhooksController } from "./controllers/webhooks.controller";
import { TelegramWebhooksController } from "./controllers/telegram.controller";
import { EventPublisherService } from "./services/event-publisher.service";
import { WebhooksService } from "./services/webhooks.service";

@Module({
  imports: [RedisModule, InstancesModule],
  controllers: [WebhooksController, TelegramWebhooksController],
  providers: [EventPublisherService, WebhooksService],
})
export class WebhooksModule {}
