import { Injectable } from "@nestjs/common";

import { RedisService } from "./redis.service";

@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  private ttlSeconds() {
    const raw = Number(process.env.METRICS_CACHE_TTL_S ?? 300);
    return Number.isFinite(raw) && raw > 0 ? raw : 300;
  }

  private bustKey(companyId: string) {
    return `metrics:bust:${companyId}`;
  }

  async bumpCompanyMetrics(companyId: string): Promise<void> {
    await this.redis.set(this.bustKey(companyId), String(Date.now()));
  }

  async getCompanyBust(companyId: string): Promise<string> {
    return (await this.redis.get(this.bustKey(companyId))) ?? "0";
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), ttlSeconds ?? this.ttlSeconds());
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
