import { Module } from "@nestjs/common";

import { LoggerService } from "../../common/logging/logger.service";
import { AutentiqueModule } from "../../infrastructure/autentique/autentique.module";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { ContractsController } from "./controllers/contracts.controller";
import { WebhooksController } from "./controllers/webhooks.controller";
import { ContractsService } from "./services/contracts.service";
import { WebhookProcessorService } from "./services/webhook-processor.service";

@Module({
  imports: [SupabaseModule, RedisModule, AutentiqueModule],
  controllers: [ContractsController, WebhooksController],
  providers: [LoggerService, ContractsService, WebhookProcessorService],
})
export class ContractsModule {}
