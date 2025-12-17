import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { HealthModule } from "./modules/health/health.module";
import { autentiqueConfig } from "./config/autentique.config";
import { redisConfig } from "./config/redis.config";
import { supabaseConfig } from "./config/supabase.config";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { LoggerService } from "./common/logging/logger.service";
import { AutentiqueModule } from "./infrastructure/autentique/autentique.module";
import { PrometheusModule } from "./infrastructure/metrics/prometheus.module";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { SupabaseModule } from "./infrastructure/supabase/supabase.module";
import { ContractsModule } from "./modules/contracts/contracts.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [supabaseConfig, redisConfig, autentiqueConfig] }),
    SupabaseModule,
    RedisModule,
    PrometheusModule,
    AutentiqueModule,
    ContractsModule,
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
