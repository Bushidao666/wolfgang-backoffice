import { Injectable, Module, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

@Injectable()
class TracingService implements OnModuleInit, OnModuleDestroy {
  private sdk: NodeSDK | null = null;

  async onModuleInit() {
    const enabled = (process.env.OTEL_TRACING_ENABLED ?? "true") !== "false";
    if (!enabled) return;

    const serviceName = process.env.SERVICE_NAME ?? "backoffice-api";
    const exporterUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() || "http://localhost:4318/v1/traces";

    const exporter = new OTLPTraceExporter({ url: exporterUrl });

    this.sdk = new NodeSDK({
      resource: resourceFromAttributes({ [SEMRESATTRS_SERVICE_NAME]: serviceName }),
      traceExporter: exporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    });

    await this.sdk.start();
  }

  async onModuleDestroy() {
    await this.sdk?.shutdown().catch(() => undefined);
    this.sdk = null;
  }
}

@Module({
  providers: [TracingService],
})
export class TracingModule {}
