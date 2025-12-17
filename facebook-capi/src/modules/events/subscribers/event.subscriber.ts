import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { RedisChannels } from "@wolfgang/contracts";
import { ContractSignedEventSchema, LeadCreatedEventSchema, LeadQualifiedEventSchema } from "@wolfgang/contracts";

import { LoggerService } from "../../../common/logging/logger.service";
import { EventBusService } from "../../../infrastructure/messaging/event-bus.service";
import { EventsService } from "../services/events.service";

@Injectable()
export class EventSubscriber implements OnModuleInit, OnModuleDestroy {
  private unsubscribers: Array<() => Promise<void>> = [];

  constructor(
    private readonly bus: EventBusService,
    private readonly events: EventsService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    this.unsubscribers.push(
      await this.bus.subscribe(RedisChannels.LEAD_CREATED, LeadCreatedEventSchema, async (event) => {
        await this.events.handleLeadCreated(event);
      }),
    );
    this.unsubscribers.push(
      await this.bus.subscribe(RedisChannels.LEAD_QUALIFIED, LeadQualifiedEventSchema, async (event) => {
        await this.events.handleLeadQualified(event);
      }),
    );
    this.unsubscribers.push(
      await this.bus.subscribe(RedisChannels.CONTRACT_SIGNED, ContractSignedEventSchema, async (event) => {
        await this.events.handleContractSigned(event);
      }),
    );

    this.logger.log("capi.subscriber.ready", { channels: [RedisChannels.LEAD_CREATED, RedisChannels.LEAD_QUALIFIED, RedisChannels.CONTRACT_SIGNED] });
  }

  async onModuleDestroy() {
    await Promise.allSettled(this.unsubscribers.map((fn) => fn()));
  }
}

