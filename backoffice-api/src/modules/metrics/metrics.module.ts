import { Module } from "@nestjs/common";

import { RedisModule } from "../../infrastructure/redis/redis.module";
import { PrometheusModule } from "../../infrastructure/metrics/prometheus.module";
import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { WsModule } from "../../infrastructure/ws/ws.module";
import { MetricsController } from "./controllers/metrics.controller";
import { MetricsService } from "./services/metrics.service";
import { MetricsSubscriber } from "./subscribers/metrics.subscriber";

@Module({
  imports: [SupabaseModule, RedisModule, WsModule, PrometheusModule],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsSubscriber],
  exports: [MetricsService],
})
export class MetricsModule {}
