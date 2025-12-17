import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";

import {
  InstanceStatusEventSchema,
  MessageReceivedEventSchema,
  RedisChannels,
  type InstanceStatusPayload,
  type MessageReceivedPayload,
} from "@wolfgang/contracts";

import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class EventPublisherService {
  constructor(private readonly redis: RedisService) {}

  async publishMessageReceived(companyId: string, payload: MessageReceivedPayload, correlationId: string) {
    const event = MessageReceivedEventSchema.parse({
      id: randomUUID(),
      type: "message.received",
      version: 1,
      occurred_at: new Date().toISOString(),
      company_id: companyId,
      source: "evolution-manager",
      correlation_id: correlationId,
      causation_id: null,
      payload,
    });
    await this.redis.publish(RedisChannels.MESSAGE_RECEIVED, JSON.stringify(event));
  }

  async publishInstanceStatus(companyId: string, payload: InstanceStatusPayload, correlationId: string) {
    const event = InstanceStatusEventSchema.parse({
      id: randomUUID(),
      type: "instance.status",
      version: 1,
      occurred_at: new Date().toISOString(),
      company_id: companyId,
      source: "evolution-manager",
      correlation_id: correlationId,
      causation_id: null,
      payload,
    });
    await this.redis.publish(RedisChannels.INSTANCE_STATUS, JSON.stringify(event));
  }
}

