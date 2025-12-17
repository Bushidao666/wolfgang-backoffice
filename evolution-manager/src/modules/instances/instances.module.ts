import { Module } from "@nestjs/common";

import { RedisModule } from "../../infrastructure/redis/redis.module";
import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { InstancesController } from "./controllers/instances.controller";
import { InstagramService } from "./channels/instagram.service";
import { TelegramService } from "./channels/telegram.service";
import { InstanceScopeGuard } from "./guards/instance-scope.guard";
import { EvolutionApiService } from "./services/evolution-api.service";
import { InstancesService } from "./services/instances.service";

@Module({
  imports: [RedisModule, SupabaseModule],
  controllers: [InstancesController],
  providers: [EvolutionApiService, TelegramService, InstagramService, InstancesService, InstanceScopeGuard],
  exports: [InstancesService, EvolutionApiService, TelegramService, InstagramService],
})
export class InstancesModule {}
