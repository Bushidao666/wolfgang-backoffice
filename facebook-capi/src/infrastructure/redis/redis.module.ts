import { Module } from "@nestjs/common";

import { EventBusService } from "../messaging/event-bus.service";
import { RedisService } from "./redis.service";

@Module({
  providers: [RedisService, EventBusService],
  exports: [RedisService, EventBusService],
})
export class RedisModule {}
