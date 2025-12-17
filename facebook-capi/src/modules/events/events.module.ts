import { Module } from "@nestjs/common";

import { EventSubscriber } from "./subscribers/event.subscriber";
import { EventSenderService } from "./services/event-sender.service";
import { EventsService } from "./services/events.service";
import { HashingService } from "./services/hashing.service";
import { QueueProcessorService } from "./services/queue-processor.service";

@Module({
  providers: [HashingService, EventsService, EventSenderService, QueueProcessorService, EventSubscriber],
})
export class EventsModule {}

