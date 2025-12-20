import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { PostgrestExposureService } from "../services/postgrest-exposure.service";

function jitter(ms: number, factor = 0.15) {
  const delta = ms * factor;
  const min = Math.max(0, ms - delta);
  const max = ms + delta;
  return Math.floor(min + Math.random() * (max - min));
}

@Injectable()
export class PostgrestExposureWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgrestExposureWorker.name);
  private stopped = false;
  private timer: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;

  constructor(private readonly exposure: PostgrestExposureService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === "test") return;
    const enabled = String(process.env.POSTGREST_EXPOSURE_WORKER_ENABLED ?? "true").toLowerCase().trim();
    if (enabled === "0" || enabled === "false" || enabled === "no") return;

    // Fire-and-forget loop: keeps draining schemas enqueued by migrations/provisioning.
    // We intentionally do not crash the API if Postgres is temporarily unavailable.
    this.schedule(2_000);
  }

  onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(delayMs: number) {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), delayMs);
  }

  private async tick() {
    if (this.stopped) return;

    const baseIntervalMs = Number(process.env.POSTGREST_EXPOSURE_POLL_MS ?? "30000") || 30_000;
    const batchSize = Number(process.env.POSTGREST_EXPOSURE_BATCH_SIZE ?? "200") || 200;
    const maxBackoffMs = Number(process.env.POSTGREST_EXPOSURE_MAX_BACKOFF_MS ?? "300000") || 300_000;

    try {
      const { drained, remaining } = await this.exposure.drain({ limit: batchSize });
      this.consecutiveFailures = 0;

      if (drained > 0) {
        this.logger.log("postgrest_exposure.drain_ok", { drained, remaining });
      }

      const nextDelay = drained > 0 ? 2_000 : baseIntervalMs;
      this.schedule(jitter(nextDelay));
    } catch (err) {
      this.consecutiveFailures += 1;
      const message = err instanceof Error ? err.message : String(err);

      const backoff = Math.min(maxBackoffMs, baseIntervalMs * Math.pow(2, Math.min(6, this.consecutiveFailures)));
      this.logger.warn("postgrest_exposure.drain_failed", { error: message, backoff_ms: backoff });
      this.schedule(jitter(backoff));
    }
  }
}
