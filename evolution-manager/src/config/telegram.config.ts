import { registerAs } from "@nestjs/config";
import { z } from "zod";

const TelegramEnvSchema = z.object({
  TELEGRAM_API_BASE_URL: z.string().url().default("https://api.telegram.org"),
  TELEGRAM_WEBHOOK_BASE_URL: z.string().url().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
});

export type TelegramConfig = {
  apiBaseUrl: string;
  webhookBaseUrl?: string;
  webhookSecret?: string;
};

export const telegramConfig = registerAs("telegram", (): TelegramConfig => {
  const env = TelegramEnvSchema.parse(process.env);
  return {
    apiBaseUrl: env.TELEGRAM_API_BASE_URL,
    webhookBaseUrl: env.TELEGRAM_WEBHOOK_BASE_URL,
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET,
  };
});

