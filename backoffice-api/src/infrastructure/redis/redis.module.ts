import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { EventBusService } from "../messaging/event-bus.service";
import { CacheService } from "./cache.service";
import { RedisService } from "./redis.service";

@Module({
  imports: [ConfigModule],
  providers: [RedisService, CacheService, EventBusService],
  exports: [RedisService, CacheService, EventBusService],
})
export class RedisModule {}
