import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import type { RedisConfig } from "../../config/redis.config";

type SubscribeHandler<T> = (payload: T) => void | Promise<void>;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<RedisConfig>("redis") ?? {
      url: process.env.REDIS_URL ?? "redis://localhost:6379",
    };

    const options = { lazyConnect: true } as const;
    this.client = new Redis(config.url, options);
    this.publisher = new Redis(config.url, options);
    this.subscriber = new Redis(config.url, options);
  }

  async onModuleDestroy() {
    await Promise.allSettled([
      this.client.quit(),
      this.publisher.quit(),
      this.subscriber.quit(),
    ]);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, "EX", ttlSeconds);
      return;
    }
    await this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.publisher.publish(channel, message);
  }

  async subscribe<T>(
    channel: string,
    handler: SubscribeHandler<T>,
    parser: (raw: string) => T = (raw) => JSON.parse(raw) as T,
  ): Promise<() => Promise<void>> {
    const onMessage = async (incomingChannel: string, raw: string) => {
      if (incomingChannel !== channel) return;
      try {
        const payload = parser(raw);
        await handler(payload);
      } catch {
        // ignore malformed messages
      }
    };

    this.subscriber.on("message", onMessage);
    await this.subscriber.subscribe(channel);

    return async () => {
      await this.subscriber.unsubscribe(channel);
      this.subscriber.off("message", onMessage);
    };
  }
}
