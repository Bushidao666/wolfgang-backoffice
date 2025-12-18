import { Injectable, ServiceUnavailableException } from "@nestjs/common";

import { PostgresService } from "../../../infrastructure/postgres/postgres.service";

@Injectable()
export class PostgrestExposureService {
  constructor(private readonly pg: PostgresService) {}

  async ensureOperational(): Promise<void> {
    // Smoke test: ensures we have a working direct Postgres connection and that the helper
    // function exists and can run in this environment.
    await this.exposeSchema("core");
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
}

