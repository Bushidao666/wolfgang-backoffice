import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";

import { PostgresService } from "../../../infrastructure/postgres/postgres.service";

@Injectable()
export class PostgrestExposureService implements OnModuleInit {
  private readonly logger = new Logger(PostgrestExposureService.name);

  constructor(private readonly pg: PostgresService) {}

  async onModuleInit() {
    // Best-effort drain for schemas enqueued by migrations/provisioning.
    // Do not crash the service if Postgres isn't configured yet.
    try {
      await this.drainQueue(200);
    } catch (err) {
      this.logger.warn("Falha ao drenar fila de exposição de schemas do PostgREST", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async ensureOperational(): Promise<void> {
    // Smoke test: ensures we have a working direct Postgres connection and that the helper
    // function exists and can run in this environment.
    await this.exposeSchema("core");
    await this.drainQueue(200);
  }

  async exposeSchema(schemaName: string): Promise<void> {
    try {
      await this.pg.query("select core.fn_postgrest_expose_schema($1)", [schemaName]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes("APP_ENCRYPTION_KEY")) {
        throw new ServiceUnavailableException(message);
      }

      if (message.includes("pgrst.db_schemas") || message.includes("permission denied to set parameter")) {
        throw new ServiceUnavailableException(
          "Sem permissão para atualizar pgrst.db_schemas (PostgREST). Exponha o schema no Supabase (Settings → API → Exposed schemas) ou ajuste privilégios do role que executa o ALTER ROLE.",
          { error: message } as any,
        );
      }

      throw new ServiceUnavailableException("Falha ao expor schema no PostgREST", { error: message } as any);
    }
  }

  private async drainQueue(limit = 200): Promise<void> {
    const { rows } = await this.pg.query<{ schema_name: string }>(
      "select schema_name from core.postgrest_schema_exposure_queue order by created_at asc limit $1",
      [limit],
    );

    for (const row of rows ?? []) {
      const schemaName = String(row.schema_name ?? "").trim();
      if (!schemaName) continue;

      await this.pg.query("select core.fn_postgrest_expose_schema($1)", [schemaName]);
      await this.pg.query("delete from core.postgrest_schema_exposure_queue where schema_name = $1", [schemaName]);
    }
  }
}
