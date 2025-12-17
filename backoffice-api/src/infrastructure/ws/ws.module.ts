import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { LoggerService } from "../../common/logging/logger.service";
import { WsGateway } from "./ws.gateway";

@Module({
  imports: [ConfigModule],
  providers: [LoggerService, WsGateway],
  exports: [WsGateway],
})
export class WsModule {}
