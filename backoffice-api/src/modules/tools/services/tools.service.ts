import { Injectable } from "@nestjs/common";
import Ajv from "ajv";

import { ValidationError } from "@wolfgang/contracts";
import { encryptJson } from "@wolfgang/crypto";

import { requireAppEncryptionKey } from "../../../common/utils/require-encryption-key";
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

function encryptJsonOrEmpty(value: Record<string, unknown> | undefined): string {
  const payload = value ?? {};
  return Object.keys(payload).length ? (requireAppEncryptionKey(), encryptJson(payload)) : "";
}

type ToolRow = {
  id: string;
  company_id: string;
  centurion_id: string;
  tool_name: string;
  description: string | null;
  endpoint: string;
  method: string;
  auth_type: string | null;
  auth_config: Record<string, unknown> | null;
  input_schema: Record<string, unknown> | null;
  output_schema: Record<string, unknown> | null;
  timeout_ms: number | null;
  retry_count: number | null;
  is_active: boolean | null;
  headers_enc: string | null;
  auth_secrets_enc: string | null;
  created_at: string;
  updated_at: string;
};

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
      .select("id, company_id, centurion_id, tool_name, description, endpoint, method, auth_type, auth_config, input_schema, output_schema, timeout_ms, retry_count, is_active, headers_enc, auth_secrets_enc, created_at, updated_at")
      .eq("company_id", companyId)
      .eq("centurion_id", centurionId)
      .order("created_at", { ascending: false });
    if (error) throw new ValidationError("Failed to list tools", { error });
    return ((data ?? []) as unknown as ToolRow[]).map((row) => ({
      id: row.id,
      company_id: row.company_id,
      centurion_id: row.centurion_id,
      tool_name: row.tool_name,
      description: row.description,
      endpoint: row.endpoint,
      method: row.method,
      headers: {},
      has_headers: !!(row.headers_enc && String(row.headers_enc).trim()),
      auth_type: row.auth_type,
      auth_config: {},
      has_auth_secrets: !!(row.auth_secrets_enc && String(row.auth_secrets_enc).trim()),
      input_schema: row.input_schema ?? {},
      output_schema: row.output_schema,
      timeout_ms: row.timeout_ms ?? 10000,
      retry_count: row.retry_count ?? 1,
      is_active: row.is_active ?? true,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
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
        headers: {},
        headers_enc: encryptJsonOrEmpty(dto.headers),
        auth_type: dto.auth_type ?? null,
        auth_config: {},
        auth_secrets_enc: encryptJsonOrEmpty(dto.auth_config),
        input_schema: dto.input_schema,
        output_schema: dto.output_schema ?? null,
        timeout_ms: dto.timeout_ms ?? 10000,
        retry_count: dto.retry_count ?? 1,
        is_active: dto.is_active ?? true,
      })
      .select("id, company_id, centurion_id, tool_name, description, endpoint, method, auth_type, auth_config, input_schema, output_schema, timeout_ms, retry_count, is_active, headers_enc, auth_secrets_enc, created_at, updated_at")
      .single();
    if (error) throw new ValidationError("Failed to create tool", { error });
    const row = data as unknown as ToolRow;
    return {
      id: row.id,
      company_id: row.company_id,
      centurion_id: row.centurion_id,
      tool_name: row.tool_name,
      description: row.description,
      endpoint: row.endpoint,
      method: row.method,
      headers: {},
      has_headers: !!(row.headers_enc && String(row.headers_enc).trim()),
      auth_type: row.auth_type,
      auth_config: {},
      has_auth_secrets: !!(row.auth_secrets_enc && String(row.auth_secrets_enc).trim()),
      input_schema: row.input_schema ?? {},
      output_schema: row.output_schema,
      timeout_ms: row.timeout_ms ?? 10000,
      retry_count: row.retry_count ?? 1,
      is_active: row.is_active ?? true,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async update(companyId: string, centurionId: string, toolId: string, dto: Partial<CreateToolDto>) {
    if (dto.input_schema) assertValidSchema(dto.input_schema, "input_schema");
    if (dto.output_schema) assertValidSchema(dto.output_schema, "output_schema");

    const patch: Record<string, unknown> = {
      tool_name: dto.tool_name,
      description: dto.description === undefined ? undefined : dto.description ?? null,
      endpoint: dto.endpoint,
      method: dto.method,
      auth_type: dto.auth_type === undefined ? undefined : dto.auth_type ?? null,
      input_schema: dto.input_schema,
      output_schema: dto.output_schema === undefined ? undefined : dto.output_schema ?? null,
      timeout_ms: dto.timeout_ms,
      retry_count: dto.retry_count,
      is_active: dto.is_active,
    };

    if (dto.headers !== undefined) {
      patch.headers = {};
      patch.headers_enc = encryptJsonOrEmpty(dto.headers);
    }
    if (dto.auth_config !== undefined) {
      patch.auth_config = {};
      patch.auth_secrets_enc = encryptJsonOrEmpty(dto.auth_config);
    }

    const { data, error } = await this.admin()
      .schema("core")
      .from("tool_configs")
      .update(patch)
      .eq("id", toolId)
      .eq("company_id", companyId)
      .eq("centurion_id", centurionId)
      .select("id, company_id, centurion_id, tool_name, description, endpoint, method, auth_type, auth_config, input_schema, output_schema, timeout_ms, retry_count, is_active, headers_enc, auth_secrets_enc, created_at, updated_at")
      .maybeSingle();

    if (error) throw new ValidationError("Failed to update tool", { error });
    if (!data) throw new ValidationError("Tool not found");
    const row = data as unknown as ToolRow;
    return {
      id: row.id,
      company_id: row.company_id,
      centurion_id: row.centurion_id,
      tool_name: row.tool_name,
      description: row.description,
      endpoint: row.endpoint,
      method: row.method,
      headers: {},
      has_headers: !!(row.headers_enc && String(row.headers_enc).trim()),
      auth_type: row.auth_type,
      auth_config: {},
      has_auth_secrets: !!(row.auth_secrets_enc && String(row.auth_secrets_enc).trim()),
      input_schema: row.input_schema ?? {},
      output_schema: row.output_schema,
      timeout_ms: row.timeout_ms ?? 10000,
      retry_count: row.retry_count ?? 1,
      is_active: row.is_active ?? true,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
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
