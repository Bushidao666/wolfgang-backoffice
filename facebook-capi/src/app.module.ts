import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { HealthModule } from "./modules/health/health.module";
import { redisConfig } from "./config/redis.config";
import { supabaseConfig } from "./config/supabase.config";
import { facebookConfig } from "./config/facebook.config";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { LoggerService } from "./common/logging/logger.service";
import { PrometheusModule } from "./infrastructure/metrics/prometheus.module";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { SupabaseModule } from "./infrastructure/supabase/supabase.module";
import { FacebookModule } from "./infrastructure/facebook/facebook.module";
import { EventsModule } from "./modules/events/events.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [redisConfig, supabaseConfig, facebookConfig] }),
    RedisModule,
    SupabaseModule,
    PrometheusModule,
    FacebookModule,
    EventsModule,
    HealthModule,
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
