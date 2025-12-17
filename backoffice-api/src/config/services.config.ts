import { registerAs } from "@nestjs/config";
import { z } from "zod";

const ServicesEnvSchema = z.object({
  AUTENTIQUE_SERVICE_URL: z.string().url().default("http://127.0.0.1:4002"),
});

export type ServicesConfig = {
  autentiqueServiceUrl: string;
};

export const servicesConfig = registerAs("services", (): ServicesConfig => {
  const env = ServicesEnvSchema.parse(process.env);
  return {
    autentiqueServiceUrl: env.AUTENTIQUE_SERVICE_URL,
  };
});

