export type RedisConfig = {
  url: string;
};

export const redisConfig = () => ({
  redis: {
    url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  } satisfies RedisConfig,
});

