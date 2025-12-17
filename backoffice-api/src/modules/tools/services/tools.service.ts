import { Injectable } from "@nestjs/common";
import Ajv from "ajv";

import { ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { CreateToolDto } from "../dto/create-tool.dto";

const ajv = new Ajv({ allErrors: true, strict: false });

function assertValidSchema(schema: Record<string, unknown>, label: string) {
  try {
    ajv.compile(schema);
  } catch (err) {
    throw new ValidationError(`${label} is not a valid JSON Schema`, { error: String(err) });
  }
}

@Injectable()
export class ToolsService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async list(companyId: string, centurionId: string) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("tool_configs")
      .select("*")
      .eq("company_id", companyId)
      .eq("centurion_id", centurionId)
      .order("created_at", { ascending: false });
    if (error) throw new ValidationError("Failed to list tools", { error });
    return data ?? [];
  }

  async create(companyId: string, centurionId: string, dto: CreateToolDto) {
    assertValidSchema(dto.input_schema, "input_schema");
    if (dto.output_schema) assertValidSchema(dto.output_schema, "output_schema");

    const { data, error } = await this.admin()
      .schema("core")
      .from("tool_configs")
      .insert({
        company_id: companyId,
        centurion_id: centurionId,
        tool_name: dto.tool_name,
        description: dto.description ?? null,
        endpoint: dto.endpoint,
        method: dto.method ?? "POST",
        headers: dto.headers ?? {},
        auth_type: dto.auth_type ?? null,
        auth_config: dto.auth_config ?? {},
        input_schema: dto.input_schema,
        output_schema: dto.output_schema ?? null,
        timeout_ms: dto.timeout_ms ?? 10000,
        retry_count: dto.retry_count ?? 1,
        is_active: dto.is_active ?? true,
      })
      .select("*")
      .single();
    if (error) throw new ValidationError("Failed to create tool", { error });
    return data;
  }

  async update(companyId: string, centurionId: string, toolId: string, dto: Partial<CreateToolDto>) {
    if (dto.input_schema) assertValidSchema(dto.input_schema, "input_schema");
    if (dto.output_schema) assertValidSchema(dto.output_schema, "output_schema");

    const { data, error } = await this.admin()
      .schema("core")
      .from("tool_configs")
      .update({
        tool_name: dto.tool_name,
        description: dto.description === undefined ? undefined : dto.description ?? null,
        endpoint: dto.endpoint,
        method: dto.method,
        headers: dto.headers,
        auth_type: dto.auth_type === undefined ? undefined : dto.auth_type ?? null,
        auth_config: dto.auth_config,
        input_schema: dto.input_schema,
        output_schema: dto.output_schema === undefined ? undefined : dto.output_schema ?? null,
        timeout_ms: dto.timeout_ms,
        retry_count: dto.retry_count,
        is_active: dto.is_active,
      })
      .eq("id", toolId)
      .eq("company_id", companyId)
      .eq("centurion_id", centurionId)
      .select("*")
      .maybeSingle();

    if (error) throw new ValidationError("Failed to update tool", { error });
    if (!data) throw new ValidationError("Tool not found");
    return data;
  }

  async delete(companyId: string, centurionId: string, toolId: string): Promise<void> {
    const { error } = await this.admin()
      .schema("core")
      .from("tool_configs")
      .delete()
      .eq("id", toolId)
      .eq("company_id", companyId)
      .eq("centurion_id", centurionId);
    if (error) throw new ValidationError("Failed to delete tool", { error });
  }
}

