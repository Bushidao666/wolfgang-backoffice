export type PostgresConfig = {
  url: string;
};

export const postgresConfig = () => ({
  postgres: {
    url: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "",
  } satisfies PostgresConfig,
});

