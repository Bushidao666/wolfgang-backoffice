import { registerAs } from "@nestjs/config";
import { z } from "zod";

import { normalizeHttpUrl } from "../common/utils/url";

const DEFAULT_AUTENTIQUE_SERVICE_URL = "http://127.0.0.1:4002";

const ServicesEnvSchema = z.object({
  AUTENTIQUE_SERVICE_URL: z.string().default(DEFAULT_AUTENTIQUE_SERVICE_URL),
  AUTENTIQUE_SERVICE_INTERNAL_TOKEN: z.string().optional().default(""),
});

export type ServicesConfig = {
  autentiqueServiceUrl: string;
  autentiqueServiceInternalToken?: string;
};

const ServicesNormalizedSchema = z.object({
  AUTENTIQUE_SERVICE_URL: z.string().url(),
});

export const servicesConfig = registerAs("services", (): ServicesConfig => {
  const env = ServicesEnvSchema.parse(process.env);
  const normalized = ServicesNormalizedSchema.safeParse({
    AUTENTIQUE_SERVICE_URL: normalizeHttpUrl(env.AUTENTIQUE_SERVICE_URL),
  });
  if (!normalized.success) {
    console.error("Invalid AUTENTIQUE_SERVICE_URL; falling back to default", {
      value: env.AUTENTIQUE_SERVICE_URL,
      issues: normalized.error.issues,
    });
    return { autentiqueServiceUrl: DEFAULT_AUTENTIQUE_SERVICE_URL };
  }
  return {
    autentiqueServiceUrl: normalized.data.AUTENTIQUE_SERVICE_URL,
    autentiqueServiceInternalToken: env.AUTENTIQUE_SERVICE_INTERNAL_TOKEN?.trim() || undefined,
  };
});
