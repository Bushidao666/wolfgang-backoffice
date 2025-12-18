import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { ContractSignedEventSchema, LeadCreatedEventSchema, LeadQualifiedEventSchema, RedisChannels } from "@wolfgang/contracts";

import { CacheService } from "../../../infrastructure/redis/cache.service";
import { EventBusService } from "../../../infrastructure/messaging/event-bus.service";
import { PrometheusService } from "../../../infrastructure/metrics/prometheus.service";
import { WsGateway } from "../../../infrastructure/ws/ws.gateway";

@Injectable()
export class MetricsSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsSubscriber.name);
  private unsubscribers: Array<() => Promise<void>> = [];
  private startTask: Promise<void> | null = null;
  private stopped = false;

  constructor(
    private readonly bus: EventBusService,
    private readonly cache: CacheService,
    private readonly ws: WsGateway,
    private readonly metrics: PrometheusService,
  ) {}

  onModuleInit() {
    const disabled = (process.env.DISABLE_WORKERS ?? "").toLowerCase() === "true";
    if (disabled || process.env.NODE_ENV === "test") return;

    this.startTask ??= this.start().catch((err) => {
      this.logger.error("metrics_subscriber.start_failed", err instanceof Error ? err.stack : String(err));
    });
  }

  private async start() {
    let attempt = 0;
    while (!this.stopped) {
      attempt += 1;
      try {
        await this.subscribeAll();
        this.logger.log(`metrics_subscriber.ready attempt=${attempt}`);
        return;
      } catch (err) {
        const backoffMs = Math.min(30_000, 1_000 * 2 ** Math.min(10, attempt - 1));
        this.logger.error(
          `metrics_subscriber.subscribe_failed attempt=${attempt} retry_in_ms=${backoffMs}`,
          err instanceof Error ? err.stack : String(err),
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  private async subscribeAll() {
    const subs: Array<() => Promise<void>> = [];
    try {
      subs.push(
        await this.bus.subscribe(RedisChannels.LEAD_CREATED, LeadCreatedEventSchema, async (event) => {
          await this.cache.bumpCompanyMetrics(event.company_id);
          this.metrics.incDomainEvent(event.type);
          this.ws.emitToCompany(event.company_id, "lead.created", { lead_id: event.payload.lead_id, occurred_at: event.occurred_at });
          this.ws.emitToCompany(event.company_id, "metrics.invalidate", { reason: "lead.created" });
        }),
      );

      subs.push(
        await this.bus.subscribe(RedisChannels.LEAD_QUALIFIED, LeadQualifiedEventSchema, async (event) => {
          await this.cache.bumpCompanyMetrics(event.company_id);
          this.metrics.incDomainEvent(event.type);
          this.ws.emitToCompany(event.company_id, "lead.qualified", { lead_id: event.payload.lead_id, occurred_at: event.occurred_at });
          this.ws.emitToCompany(event.company_id, "metrics.invalidate", { reason: "lead.qualified" });
        }),
      );

      subs.push(
        await this.bus.subscribe(RedisChannels.CONTRACT_SIGNED, ContractSignedEventSchema, async (event) => {
          await this.cache.bumpCompanyMetrics(event.company_id);
          this.metrics.incDomainEvent(event.type);
          this.ws.emitToCompany(event.company_id, "contract.signed", { contract_id: event.payload.contract_id, occurred_at: event.occurred_at });
          this.ws.emitToCompany(event.company_id, "metrics.invalidate", { reason: "contract.signed" });
        }),
      );

      this.unsubscribers = subs;
    } catch (err) {
      await Promise.allSettled(subs.map((fn) => fn()));
      throw err;
    }
  }

  async onModuleDestroy() {
    this.stopped = true;
    await Promise.allSettled(this.unsubscribers.map((fn) => fn()));
  }
}
