import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import type { RedisConfig } from "../../config/redis.config";

type SubscribeHandler = (payload: string) => void | Promise<void>;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(private readonly configService: ConfigService) {
    const cfg = this.configService.get<RedisConfig>("redis") ?? {
      url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    };

    const options = { lazyConnect: true } as const;
    this.client = new Redis(cfg.url, options);
    this.publisher = new Redis(cfg.url, options);
    this.subscriber = new Redis(cfg.url, options);
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

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const ttl = Math.max(1, Math.floor(ttlSeconds));
    const res = await this.client.set(key, value, "EX", ttl, "NX");
    return res === "OK";
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async publish(channel: string, payload: string): Promise<number> {
    return this.publisher.publish(channel, payload);
  }

  async subscribe(channel: string, handler: SubscribeHandler): Promise<() => Promise<void>> {
    const onMessage = async (incomingChannel: string, message: string) => {
      if (incomingChannel !== channel) return;
      try {
        await handler(message);
      } catch {
        // ignore handler errors to keep subscriber alive
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
