import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { LoggerService } from "../../../common/logging/logger.service";
import { RedisService } from "../../../infrastructure/redis/redis.service";
import { EventSenderService } from "./event-sender.service";

const QUEUE_PENDING = "capi:events:pending";

@Injectable()
export class QueueProcessorService implements OnModuleInit, OnModuleDestroy {
  private running = true;
  private loop?: Promise<void>;

  constructor(
    private readonly redis: RedisService,
    private readonly sender: EventSenderService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    this.loop = this.run().catch((err) => {
      this.logger.error("capi.processor.crashed", err instanceof Error ? err : { err });
    });
  }

  async onModuleDestroy() {
    this.running = false;
    await this.loop;
  }

  private async run(): Promise<void> {
    this.logger.log("capi.processor.started");
    while (this.running) {
      await this.sender.promoteDueRetries();
      const id = await this.redis.brpop(QUEUE_PENDING, 5);
      if (!id) continue;
      await this.sender.processLogId(id);
    }
    this.logger.log("capi.processor.stopped");
  }
}

