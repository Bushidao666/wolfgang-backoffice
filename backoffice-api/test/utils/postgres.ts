import { Pool } from "pg";

let pool: Pool | undefined;

export function quoteIdent(name: string): string {
  if (!/^[a-z0-9_]+$/i.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return `"${name}"`;
}

export function getPostgresPool(): Pool {
  if (pool) return pool;

  const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "";
  if (!url) {
    throw new Error("Missing SUPABASE_DB_URL (or DATABASE_URL) for integration tests");
  }

  pool = new Pool({ connectionString: url, max: 4 });
  return pool;
}

export async function pgQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await getPostgresPool().query<T>(text, params);
  return res.rows ?? [];
}

export async function closePostgresPool(): Promise<void> {
  if (!pool) return;
  const toClose = pool;
  pool = undefined;
  await toClose.end();
}

