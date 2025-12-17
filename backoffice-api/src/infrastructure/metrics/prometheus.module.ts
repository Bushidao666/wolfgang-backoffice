import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { PrometheusController } from "./prometheus.controller";
import { PrometheusInterceptor } from "./prometheus.interceptor";
import { PrometheusService } from "./prometheus.service";

@Module({
  controllers: [PrometheusController],
  providers: [
    PrometheusService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PrometheusInterceptor,
    },
  ],
  exports: [PrometheusService],
})
export class PrometheusModule {}

