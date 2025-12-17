import { registerAs } from "@nestjs/config";
import { z } from "zod";

const FacebookEnvSchema = z.object({
  FACEBOOK_API_VERSION: z.string().default("v20.0"),
  FACEBOOK_GRAPH_BASE_URL: z.string().url().default("https://graph.facebook.com"),
  CAPI_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(6),
  CAPI_RETRY_BASE_DELAY_S: z.coerce.number().int().min(5).max(3600).default(30),
});

export type FacebookConfig = {
  apiVersion: string;
  graphBaseUrl: string;
  maxAttempts: number;
  retryBaseDelayS: number;
};

export const facebookConfig = registerAs("facebook", (): FacebookConfig => {
  const env = FacebookEnvSchema.parse(process.env);
  return {
    apiVersion: env.FACEBOOK_API_VERSION,
    graphBaseUrl: env.FACEBOOK_GRAPH_BASE_URL,
    maxAttempts: env.CAPI_MAX_ATTEMPTS,
    retryBaseDelayS: env.CAPI_RETRY_BASE_DELAY_S,
  };
});

