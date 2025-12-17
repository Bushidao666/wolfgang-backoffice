import { registerAs } from "@nestjs/config";
import { z } from "zod";

const AutentiqueEnvSchema = z.object({
  AUTENTIQUE_API_KEY: z.string().optional().default(""),
  AUTENTIQUE_BASE_URL: z.string().url().default("https://api.autentique.com.br/v2"),
  AUTENTIQUE_WEBHOOK_SECRET: z.string().optional().default(""),
});

export type AutentiqueConfig = {
  apiKey: string;
  baseUrl: string;
  webhookSecret: string;
};

export const autentiqueConfig = registerAs("autentique", (): AutentiqueConfig => {
  const env = AutentiqueEnvSchema.parse(process.env);
  return {
    apiKey: env.AUTENTIQUE_API_KEY,
    baseUrl: env.AUTENTIQUE_BASE_URL,
    webhookSecret: env.AUTENTIQUE_WEBHOOK_SECRET,
  };
});

