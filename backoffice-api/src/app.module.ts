import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { HealthModule } from "./modules/health/health.module";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { LoggerService } from "./common/logging/logger.service";
import { redisConfig } from "./config/redis.config";
import { servicesConfig } from "./config/services.config";
import { supabaseConfig } from "./config/supabase.config";
import { postgresConfig } from "./config/postgres.config";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { SupabaseModule } from "./infrastructure/supabase/supabase.module";
import { PrometheusModule } from "./infrastructure/metrics/prometheus.module";
import { AuditModule } from "./infrastructure/audit/audit.module";
import { TracingModule } from "./infrastructure/tracing/tracing.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { CenturionsModule } from "./modules/centurions/centurions.module";
import { ContractsModule } from "./modules/contracts/contracts.module";
import { DealsModule } from "./modules/deals/deals.module";
import { FollowupsModule } from "./modules/followups/followups.module";
import { KnowledgeBaseModule } from "./modules/knowledge-base/kb.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { McpModule } from "./modules/mcp/mcp.module";
import { MarketingModule } from "./modules/marketing/marketing.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { ToolsModule } from "./modules/tools/tools.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [supabaseConfig, redisConfig, servicesConfig, postgresConfig] }),
    TracingModule,
    SupabaseModule,
    RedisModule,
    PrometheusModule,
    AuditModule,
    AuthModule,
    CompaniesModule,
    CenturionsModule,
    ContractsModule,
    DealsModule,
    FollowupsModule,
    KnowledgeBaseModule,
    LeadsModule,
    McpModule,
    MarketingModule,
    MetricsModule,
    ToolsModule,
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
