import { registerAs } from "@nestjs/config";
import { z } from "zod";

import { normalizeHttpUrl } from "../common/utils/url";

const ServicesEnvSchema = z.object({
  AUTENTIQUE_SERVICE_URL: z.string().default("http://127.0.0.1:4002"),
});

export type ServicesConfig = {
  autentiqueServiceUrl: string;
};

const ServicesNormalizedSchema = z.object({
  AUTENTIQUE_SERVICE_URL: z.string().url(),
});

export const servicesConfig = registerAs("services", (): ServicesConfig => {
  const env = ServicesEnvSchema.parse(process.env);
  const normalized = ServicesNormalizedSchema.parse({
    AUTENTIQUE_SERVICE_URL: normalizeHttpUrl(env.AUTENTIQUE_SERVICE_URL),
  });
  return {
    autentiqueServiceUrl: normalized.AUTENTIQUE_SERVICE_URL,
  };
});
