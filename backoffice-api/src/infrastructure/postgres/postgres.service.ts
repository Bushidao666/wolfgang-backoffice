import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, type QueryResult } from "pg";

import type { PostgresConfig } from "../../config/postgres.config";

@Injectable()
export class PostgresService implements OnModuleDestroy {
  private pool?: Pool;

  constructor(private readonly configService: ConfigService) {}

  private getPool(): Pool {
    if (this.pool) return this.pool;

    const cfg = this.configService.get<PostgresConfig>("postgres") ?? {
      url: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "",
    };

    if (!cfg.url) {
      throw new Error("SUPABASE_DB_URL (or DATABASE_URL) is required for Postgres access");
    }

    this.pool = new Pool({ connectionString: cfg.url });
    return this.pool;
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.getPool().query<T>(text, params);
  }

  async onModuleDestroy() {
    if (!this.pool) return;
    const pool = this.pool;
    this.pool = undefined;
    await pool.end().catch(() => undefined);
  }
}

