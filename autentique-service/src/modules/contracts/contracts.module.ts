import { Module } from "@nestjs/common";

import { ContractsController } from "./controllers/contracts.controller";
import { WebhooksController } from "./controllers/webhooks.controller";
import { ContractsService } from "./services/contracts.service";
import { WebhookProcessorService } from "./services/webhook-processor.service";

@Module({
  controllers: [ContractsController, WebhooksController],
  providers: [ContractsService, WebhookProcessorService],
})
export class ContractsModule {}

