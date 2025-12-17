import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createDecipheriv, createHash } from "crypto";

import { LoggerService } from "../../../common/logging/logger.service";
import type { FacebookConfig } from "../../../config/facebook.config";
import { FacebookClient, type FacebookApiError, type CapiEventPayload } from "../../../infrastructure/facebook/facebook.client";
import { RedisService } from "../../../infrastructure/redis/redis.service";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";

type PixelConfigRow = {
  id: string;
  company_id: string;
  pixel_id: string;
  meta_access_token: string;
  meta_test_event_code: string | null;
  domain: string | null;
  is_active: boolean;
};

type EventLogRow = {
  id: string;
  company_id: string;
  pixel_id: string;
  event_name: string;
  event_time: string;
  event_payload: CapiEventPayload;
  status: "pending" | "sent" | "failed" | "retrying";
  attempts: number;
  source_event: string | null;
  source_id: string | null;
};

const QUEUE_PENDING = "capi:events:pending";
const QUEUE_RETRY = "capi:events:retry";
const QUEUE_DLQ = "capi:events:dlq";

function getEncryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY ?? "";
  if (!raw) throw new Error("APP_ENCRYPTION_KEY is required");
  return createHash("sha256").update(raw).digest();
}

function decryptSecret(encrypted: string): string {
  if (!encrypted.startsWith("v1:")) return encrypted;
  const [, ivB64, tagB64, dataB64] = encrypted.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted secret format");
  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf8");
}

function toEpochSeconds(value: string): number {
  const date = new Date(value);
  const seconds = Math.floor(date.getTime() / 1000);
  return Number.isFinite(seconds) ? seconds : Math.floor(Date.now() / 1000);
}

@Injectable()
export class EventSenderService {
  private readonly config: FacebookConfig;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly facebook: FacebookClient,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.get<FacebookConfig>("facebook") ?? {
      apiVersion: process.env.FACEBOOK_API_VERSION ?? "v20.0",
      graphBaseUrl: process.env.FACEBOOK_GRAPH_BASE_URL ?? "https://graph.facebook.com",
      maxAttempts: 6,
      retryBaseDelayS: 30,
    };
  }

  private admin() {
    return this.supabase.getAdminClient();
  }

  async processLogId(logId: string): Promise<void> {
    const { data: log, error: logErr } = await this.admin()
      .schema("core")
      .from("capi_event_logs")
      .select("id, company_id, pixel_id, event_name, event_time, event_payload, status, attempts, source_event, source_id")
      .eq("id", logId)
      .maybeSingle();
    if (logErr) {
      this.logger.warn("capi.log.fetch_failed", { log_id: logId, error: logErr });
      return;
    }
    if (!log) return;

    const logRow = log as unknown as EventLogRow;

    const { data: pixel, error: pixelErr } = await this.admin()
      .schema("core")
      .from("pixel_configs")
      .select("id, company_id, pixel_id, meta_access_token, meta_test_event_code, domain, is_active")
      .eq("company_id", logRow.company_id)
      .eq("pixel_id", logRow.pixel_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pixelErr) {
      await this.fail(logRow, { message: pixelErr.message, code: "pixel_fetch" });
      return;
    }
    if (!pixel) {
      await this.fail(logRow, { message: "Pixel config not found/active", code: "pixel_missing" });
      return;
    }

    const pixelRow = pixel as unknown as PixelConfigRow;
    const accessToken = decryptSecret(pixelRow.meta_access_token);

    const event = {
      ...logRow.event_payload,
      event_time: toEpochSeconds(logRow.event_time),
      event_source_url: logRow.event_payload.event_source_url ?? (pixelRow.domain ? pixelRow.domain.replace(/\/$/, "") : undefined),
    };

    try {
      const response = await this.facebook.sendEvents({
        pixelId: pixelRow.pixel_id,
        accessToken,
        events: [event],
      });
      await this.markSent(logRow, response.fbtrace_id ?? undefined);
    } catch (err) {
      const status = typeof (err as any)?.status === "number" ? ((err as any).status as number) : undefined;
      const fbError = ((err as any)?.fb_error ?? null) as FacebookApiError | null;
      const errorCode = fbError?.code ? String(fbError.code) : status ? String(status) : "unknown";
      const errorMessage = fbError?.message ?? (err instanceof Error ? err.message : "Unknown error");
      const fbTraceId = fbError?.fbtrace_id;

      const attempts = (logRow.attempts ?? 0) + 1;
      const shouldRetry = this.shouldRetry(status, fbError, attempts);

      if (shouldRetry) {
        await this.scheduleRetry(logRow, attempts, { errorCode, errorMessage, fbTraceId });
      } else {
        await this.fail(logRow, { code: errorCode, message: errorMessage, trace: fbTraceId });
      }
    }
  }

  private shouldRetry(status: number | undefined, _fbError: FacebookApiError | null, attempts: number) {
    if (attempts >= this.config.maxAttempts) return false;
    if (!status) return true;
    if (status === 429) return true;
    if (status >= 500) return true;
    return false;
  }

  private async markSent(log: EventLogRow, fbTraceId?: string) {
    const patch: Record<string, unknown> = {
      status: "sent",
      attempts: (log.attempts ?? 0) + 1,
      last_attempt_at: new Date().toISOString(),
      fb_trace_id: fbTraceId ?? null,
      error_message: null,
      error_code: null,
    };
    const { error } = await this.admin().schema("core").from("capi_event_logs").update(patch).eq("id", log.id);
    if (error) {
      this.logger.warn("capi.log.update_failed", { log_id: log.id, error });
    }
    this.logger.log("capi.sent", { log_id: log.id, company_id: log.company_id, pixel_id: log.pixel_id, event_name: log.event_name });
  }

  private async scheduleRetry(log: EventLogRow, attempts: number, err: { errorCode: string; errorMessage: string; fbTraceId?: string }) {
    const patch: Record<string, unknown> = {
      status: "retrying",
      attempts,
      last_attempt_at: new Date().toISOString(),
      fb_trace_id: err.fbTraceId ?? null,
      error_message: err.errorMessage,
      error_code: err.errorCode,
    };
    await this.admin().schema("core").from("capi_event_logs").update(patch).eq("id", log.id);

    const delaySeconds = Math.min(this.config.retryBaseDelayS * 2 ** Math.max(0, attempts - 1), 60 * 60);
    const runAtMs = Date.now() + delaySeconds * 1000;
    await this.redis.zadd(QUEUE_RETRY, runAtMs, log.id);
    this.logger.warn("capi.retry_scheduled", { log_id: log.id, attempts, delay_s: delaySeconds, code: err.errorCode });
  }

  private async fail(log: EventLogRow, err: { code?: string; message: string; trace?: string }) {
    const patch: Record<string, unknown> = {
      status: "failed",
      attempts: (log.attempts ?? 0) + 1,
      last_attempt_at: new Date().toISOString(),
      fb_trace_id: err.trace ?? null,
      error_message: err.message,
      error_code: err.code ?? null,
    };
    await this.admin().schema("core").from("capi_event_logs").update(patch).eq("id", log.id);
    await this.redis.rpush(
      QUEUE_DLQ,
      JSON.stringify({ id: log.id, company_id: log.company_id, pixel_id: log.pixel_id, event_name: log.event_name, error: err }),
    );
    this.logger.error("capi.failed", { log_id: log.id, company_id: log.company_id, pixel_id: log.pixel_id, event_name: log.event_name, error: err });
  }

  async promoteDueRetries(limit = 50): Promise<void> {
    const due = await this.redis.zrangebyscore(QUEUE_RETRY, 0, Date.now(), limit);
    if (!due.length) return;

    for (const id of due) {
      const removed = await this.redis.zrem(QUEUE_RETRY, id);
      if (!removed) continue;
      await this.redis.rpush(QUEUE_PENDING, id);
    }
  }
}
