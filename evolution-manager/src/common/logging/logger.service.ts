import { Injectable, LoggerService as NestLoggerService } from "@nestjs/common";

import { createLogger } from "@wolfgang/logger";

type LogMeta = Record<string, unknown>;

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger = createLogger({ service: process.env.SERVICE_NAME ?? "evolution-manager" });

  log(message: unknown, ...optionalParams: unknown[]) {
    this.logger.info(message, this.extract(optionalParams));
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.logger.error(message, this.extract(optionalParams));
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.logger.warn(message, this.extract(optionalParams));
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    this.logger.debug(message, this.extract(optionalParams));
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    this.logger.trace(message, this.extract(optionalParams));
  }

  private extract(params: unknown[]): LogMeta {
    const meta: LogMeta = {};

    for (const param of params) {
      if (!param) continue;
      if (typeof param === "string") {
        meta.context = param;
        continue;
      }
      if (param instanceof Error) {
        meta.error = {
          name: param.name,
          message: param.message,
          stack: param.stack,
        };
        continue;
      }
      if (typeof param === "object") {
        Object.assign(meta, param as LogMeta);
      }
    }

    return meta;
  }
}
