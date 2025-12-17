import { Module } from "@nestjs/common";

import { LoggerService } from "../../common/logging/logger.service";
import { FacebookModule } from "../../infrastructure/facebook/facebook.module";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { EventSubscriber } from "./subscribers/event.subscriber";
import { EventSenderService } from "./services/event-sender.service";
import { EventsService } from "./services/events.service";
import { HashingService } from "./services/hashing.service";
import { QueueProcessorService } from "./services/queue-processor.service";

@Module({
  imports: [RedisModule, SupabaseModule, FacebookModule],
  providers: [LoggerService, HashingService, EventsService, EventSenderService, QueueProcessorService, EventSubscriber],
})
export class EventsModule {}
