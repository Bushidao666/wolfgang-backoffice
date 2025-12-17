import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { HealthModule } from "./modules/health/health.module";
import { redisConfig } from "./config/redis.config";
import { supabaseConfig } from "./config/supabase.config";
import { evolutionConfig } from "./config/evolution.config";
import { telegramConfig } from "./config/telegram.config";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { SupabaseModule } from "./infrastructure/supabase/supabase.module";
import { PrometheusModule } from "./infrastructure/metrics/prometheus.module";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { LoggerService } from "./common/logging/logger.service";
import { InstancesModule } from "./modules/instances/instances.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { MessagesModule } from "./modules/messages/messages.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [redisConfig, supabaseConfig, evolutionConfig, telegramConfig] }),
    RedisModule,
    SupabaseModule,
    PrometheusModule,
    HealthModule,
    InstancesModule,
    WebhooksModule,
    MessagesModule,
  ],
  providers: [
    LoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
