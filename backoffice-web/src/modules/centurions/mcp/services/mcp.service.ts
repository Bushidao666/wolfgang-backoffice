import { apiFetch } from "@/lib/api/client";

export type McpServerRow = {
  id: string;
  company_id: string;
  centurion_id: string;
  name: string;
  server_url: string;
  auth_type: string | null;
  auth_config: Record<string, unknown> | null;
  tools_available: unknown[] | null;
  last_tools_sync_at: string | null;
  is_active: boolean | null;
  connection_status: "unknown" | "connected" | "disconnected" | "error";
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateMcpServerInput = {
  name: string;
  server_url: string;
  auth_type?: string;
  auth_config?: Record<string, unknown>;
  is_active?: boolean;
};

export async function listMcpServers(companyId: string, centurionId: string) {
  return apiFetch<McpServerRow[]>(`/centurions/${encodeURIComponent(centurionId)}/mcp-servers`, {
    headers: { "x-company-id": companyId },
  });
}

export async function createMcpServer(companyId: string, centurionId: string, payload: CreateMcpServerInput) {
  return apiFetch<McpServerRow>(`/centurions/${encodeURIComponent(centurionId)}/mcp-servers`, {
    method: "POST",
    headers: { "x-company-id": companyId },
    body: JSON.stringify(payload),
  });
}

export async function deleteMcpServer(companyId: string, centurionId: string, serverId: string) {
  return apiFetch<void>(`/centurions/${encodeURIComponent(centurionId)}/mcp-servers/${encodeURIComponent(serverId)}`, {
    method: "DELETE",
    headers: { "x-company-id": companyId },
  });
}

