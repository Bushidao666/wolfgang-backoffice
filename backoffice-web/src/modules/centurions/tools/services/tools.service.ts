import { apiFetch } from "@/lib/api/client";

export type ToolConfigRow = {
  id: string;
  company_id: string;
  centurion_id: string;
  tool_name: string;
  description: string | null;
  endpoint: string;
  method: string;
  headers: Record<string, unknown> | null;
  has_headers?: boolean;
  auth_type: string | null;
  auth_config: Record<string, unknown> | null;
  has_auth_secrets?: boolean;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown> | null;
  timeout_ms: number | null;
  retry_count: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};

export type CreateToolInput = {
  tool_name: string;
  description?: string;
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, unknown>;
  auth_type?: string;
  auth_config?: Record<string, unknown>;
  input_schema: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  timeout_ms?: number;
  retry_count?: number;
  is_active?: boolean;
};

export async function listTools(companyId: string, centurionId: string) {
  return apiFetch<ToolConfigRow[]>(`/centurions/${encodeURIComponent(centurionId)}/tools`, {
    headers: { "x-company-id": companyId },
  });
}

export async function createTool(companyId: string, centurionId: string, payload: CreateToolInput) {
  return apiFetch<ToolConfigRow>(`/centurions/${encodeURIComponent(centurionId)}/tools`, {
    method: "POST",
    headers: { "x-company-id": companyId },
    body: JSON.stringify(payload),
  });
}

export async function updateTool(companyId: string, centurionId: string, toolId: string, payload: Partial<CreateToolInput>) {
  return apiFetch<ToolConfigRow>(`/centurions/${encodeURIComponent(centurionId)}/tools/${encodeURIComponent(toolId)}`, {
    method: "PATCH",
    headers: { "x-company-id": companyId },
    body: JSON.stringify(payload),
  });
}

export async function deleteTool(companyId: string, centurionId: string, toolId: string) {
  return apiFetch<void>(`/centurions/${encodeURIComponent(centurionId)}/tools/${encodeURIComponent(toolId)}`, {
    method: "DELETE",
    headers: { "x-company-id": companyId },
  });
}
