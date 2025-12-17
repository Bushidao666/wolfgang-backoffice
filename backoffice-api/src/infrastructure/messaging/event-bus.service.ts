import { Injectable } from "@nestjs/common";
import { z } from "zod";

import type { RedisChannel } from "@wolfgang/contracts";
import { RedisService } from "../redis/redis.service";

type EventHandler<T> = (event: T) => void | Promise<void>;

@Injectable()
export class EventBusService {
  constructor(private readonly redis: RedisService) {}

  async publish<T extends object>(channel: RedisChannel, event: T): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(event));
  }

  async subscribe<T>(
    channel: RedisChannel,
    schema: z.ZodType<T, any, any>,
    handler: EventHandler<T>,
  ): Promise<() => Promise<void>> {
    return this.redis.subscribe(channel, async (raw) => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        // ignore invalid events; producers/consumers should evolve via versioning
        return;
      }
      await handler(parsed.data);
    });
  }
}
