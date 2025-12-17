import { Injectable } from "@nestjs/common";

import { ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { CreateMcpServerDto } from "../dto/create-mcp-server.dto";

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
      .select("*")
      .eq("company_id", companyId)
      .eq("centurion_id", centurionId)
      .order("created_at", { ascending: false });

    if (error) throw new ValidationError("Failed to list MCP servers", { error });
    return data ?? [];
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
        auth_config: dto.auth_config ?? {},
        is_active: dto.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) throw new ValidationError("Failed to create MCP server", { error });
    return data;
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

