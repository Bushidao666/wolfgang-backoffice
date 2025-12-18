import { Injectable } from "@nestjs/common";

import { ValidationError } from "@wolfgang/contracts";
import { encryptJson } from "@wolfgang/crypto";

import { requireAppEncryptionKey } from "../../../common/utils/require-encryption-key";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { CreateMcpServerDto } from "../dto/create-mcp-server.dto";

function encryptJsonOrEmpty(value: Record<string, unknown> | undefined): string {
  const payload = value ?? {};
  return Object.keys(payload).length ? (requireAppEncryptionKey(), encryptJson(payload)) : "";
}

type McpRow = {
  id: string;
  company_id: string;
  centurion_id: string;
  name: string;
  server_url: string;
  auth_type: string | null;
  auth_config: Record<string, unknown> | null;
  auth_secrets_enc: string | null;
  tools_available: unknown[] | null;
  last_tools_sync_at: string | null;
  is_active: boolean | null;
  connection_status: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class McpService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async list(companyId: string, centurionId: string) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("mcp_servers")
      .select("id, company_id, centurion_id, name, server_url, auth_type, auth_config, auth_secrets_enc, tools_available, last_tools_sync_at, is_active, connection_status, last_error, created_at, updated_at")
      .eq("company_id", companyId)
      .eq("centurion_id", centurionId)
      .order("created_at", { ascending: false });

    if (error) throw new ValidationError("Failed to list MCP servers", { error });
    return ((data ?? []) as unknown as McpRow[]).map((row) => ({
      id: row.id,
      company_id: row.company_id,
      centurion_id: row.centurion_id,
      name: row.name,
      server_url: row.server_url,
      auth_type: row.auth_type,
      auth_config: {},
      has_auth_secrets: !!(row.auth_secrets_enc && String(row.auth_secrets_enc).trim()),
      tools_available: row.tools_available ?? [],
      last_tools_sync_at: row.last_tools_sync_at,
      is_active: row.is_active ?? true,
      connection_status: row.connection_status ?? "unknown",
      last_error: row.last_error,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async create(companyId: string, centurionId: string, dto: CreateMcpServerDto) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("mcp_servers")
      .insert({
        company_id: companyId,
        centurion_id: centurionId,
        name: dto.name,
        server_url: dto.server_url,
        auth_type: dto.auth_type ?? null,
        auth_config: {},
        auth_secrets_enc: encryptJsonOrEmpty(dto.auth_config),
        is_active: dto.is_active ?? true,
      })
      .select("id, company_id, centurion_id, name, server_url, auth_type, auth_config, auth_secrets_enc, tools_available, last_tools_sync_at, is_active, connection_status, last_error, created_at, updated_at")
      .single();

    if (error) throw new ValidationError("Failed to create MCP server", { error });
    const row = data as unknown as McpRow;
    return {
      id: row.id,
      company_id: row.company_id,
      centurion_id: row.centurion_id,
      name: row.name,
      server_url: row.server_url,
      auth_type: row.auth_type,
      auth_config: {},
      has_auth_secrets: !!(row.auth_secrets_enc && String(row.auth_secrets_enc).trim()),
      tools_available: row.tools_available ?? [],
      last_tools_sync_at: row.last_tools_sync_at,
      is_active: row.is_active ?? true,
      connection_status: row.connection_status ?? "unknown",
      last_error: row.last_error,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async delete(companyId: string, centurionId: string, serverId: string): Promise<void> {
    const { error } = await this.admin()
      .schema("core")
      .from("mcp_servers")
      .delete()
      .eq("id", serverId)
      .eq("company_id", companyId)
      .eq("centurion_id", centurionId);

    if (error) throw new ValidationError("Failed to delete MCP server", { error });
  }
}
