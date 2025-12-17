import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { FacebookConfig } from "../../config/facebook.config";

export type FacebookApiError = {
  message: string;
  type?: string;
  code?: number | string;
  error_subcode?: number;
  fbtrace_id?: string;
};

export type FacebookApiResponse = {
  events_received?: number;
  messages?: unknown[];
  fbtrace_id?: string;
};

export type CapiEventPayload = {
  event_id?: string;
  event_name: string;
  event_time: number;
  action_source: string;
  event_source_url?: string;
  user_data: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
};

@Injectable()
export class FacebookClient {
  private readonly config: FacebookConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<FacebookConfig>("facebook") ?? {
      apiVersion: process.env.FACEBOOK_API_VERSION ?? "v20.0",
      graphBaseUrl: process.env.FACEBOOK_GRAPH_BASE_URL ?? "https://graph.facebook.com",
      maxAttempts: 6,
      retryBaseDelayS: 30,
    };
  }

  get baseUrl() {
    return `${this.config.graphBaseUrl.replace(/\/$/, "")}/${this.config.apiVersion.replace(/^\//, "")}`;
  }

  async sendEvents(args: {
    pixelId: string;
    accessToken: string;
    events: CapiEventPayload[];
    testEventCode?: string;
  }): Promise<FacebookApiResponse> {
    const url = new URL(`${this.baseUrl}/${args.pixelId}/events`);
    url.searchParams.set("access_token", args.accessToken);

    const body: Record<string, unknown> = { data: args.events };
    if (args.testEventCode) body.test_event_code = args.testEventCode;

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as any) : {};

    if (!res.ok) {
      const error = (parsed?.error ?? parsed) as FacebookApiError;
      const msg = error?.message || `Facebook API error (${res.status})`;
      const err = new Error(msg);
      (err as any).status = res.status;
      (err as any).fb_error = error;
      throw err;
    }

    return parsed as FacebookApiResponse;
  }
}
