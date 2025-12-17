import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { ContractSignedEventSchema, LeadCreatedEventSchema, LeadQualifiedEventSchema, RedisChannels } from "@wolfgang/contracts";

import { CacheService } from "../../../infrastructure/redis/cache.service";
import { EventBusService } from "../../../infrastructure/messaging/event-bus.service";
import { PrometheusService } from "../../../infrastructure/metrics/prometheus.service";
import { WsGateway } from "../../../infrastructure/ws/ws.gateway";

@Injectable()
export class MetricsSubscriber implements OnModuleInit, OnModuleDestroy {
  private unsubscribers: Array<() => Promise<void>> = [];

  constructor(
    private readonly bus: EventBusService,
    private readonly cache: CacheService,
    private readonly ws: WsGateway,
    private readonly metrics: PrometheusService,
  ) {}

  async onModuleInit() {
    this.unsubscribers.push(
      await this.bus.subscribe(RedisChannels.LEAD_CREATED, LeadCreatedEventSchema, async (event) => {
        await this.cache.bumpCompanyMetrics(event.company_id);
        this.metrics.incDomainEvent(event.type);
        this.ws.emitToCompany(event.company_id, "lead.created", { lead_id: event.payload.lead_id, occurred_at: event.occurred_at });
        this.ws.emitToCompany(event.company_id, "metrics.invalidate", { reason: "lead.created" });
      }),
    );

    this.unsubscribers.push(
      await this.bus.subscribe(RedisChannels.LEAD_QUALIFIED, LeadQualifiedEventSchema, async (event) => {
        await this.cache.bumpCompanyMetrics(event.company_id);
        this.metrics.incDomainEvent(event.type);
        this.ws.emitToCompany(event.company_id, "lead.qualified", { lead_id: event.payload.lead_id, occurred_at: event.occurred_at });
        this.ws.emitToCompany(event.company_id, "metrics.invalidate", { reason: "lead.qualified" });
      }),
    );

    this.unsubscribers.push(
      await this.bus.subscribe(RedisChannels.CONTRACT_SIGNED, ContractSignedEventSchema, async (event) => {
        await this.cache.bumpCompanyMetrics(event.company_id);
        this.metrics.incDomainEvent(event.type);
        this.ws.emitToCompany(event.company_id, "contract.signed", { contract_id: event.payload.contract_id, occurred_at: event.occurred_at });
        this.ws.emitToCompany(event.company_id, "metrics.invalidate", { reason: "contract.signed" });
      }),
    );
  }

  async onModuleDestroy() {
    await Promise.allSettled(this.unsubscribers.map((fn) => fn()));
  }
}
