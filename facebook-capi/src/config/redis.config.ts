import { registerAs } from "@nestjs/config";
import { z } from "zod";

const RedisEnvSchema = z.object({
  REDIS_URL: z.string().default("redis://localhost:6379"),
});

export type RedisConfig = {
  url: string;
};

export const redisConfig = registerAs("redis", (): RedisConfig => {
  const env = RedisEnvSchema.parse(process.env);
  return { url: env.REDIS_URL };
});

