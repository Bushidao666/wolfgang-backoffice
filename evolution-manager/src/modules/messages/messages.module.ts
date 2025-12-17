import { Module } from "@nestjs/common";

import { InstancesModule } from "../instances/instances.module";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { MessagesSubscriber } from "./subscribers/messages.subscriber";

@Module({
  imports: [RedisModule, InstancesModule],
  providers: [MessagesSubscriber],
})
export class MessagesModule {}

