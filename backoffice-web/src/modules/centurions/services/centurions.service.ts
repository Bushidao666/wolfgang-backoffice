import { apiFetch } from "@/lib/api/client";

export type CenturionConfig = {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  prompt: string;
  personality: Record<string, unknown>;
  qualification_rules: Record<string, unknown>;
  can_send_audio: boolean;
  can_send_image: boolean;
  can_send_video: boolean;
  can_process_audio: boolean;
  can_process_image: boolean;
  message_chunking_enabled: boolean;
  chunk_delay_ms: number;
  debounce_wait_ms: number;
  is_active: boolean;
  max_retries: number;
  total_conversations?: number;
  total_qualified?: number;
  created_at: string;
  updated_at: string;
};

export type CreateCenturionInput = {
  name: string;
  slug: string;
  prompt: string;
  personality?: Record<string, unknown>;
  qualification_rules?: Record<string, unknown>;
  can_send_audio?: boolean;
  can_send_image?: boolean;
  can_send_video?: boolean;
  can_process_audio?: boolean;
  can_process_image?: boolean;
  message_chunking_enabled?: boolean;
  chunk_delay_ms?: number;
  debounce_wait_ms?: number;
  is_active?: boolean;
  max_retries?: number;
};

export type UpdateCenturionInput = Partial<CreateCenturionInput>;

export async function listCenturions(companyId: string) {
  return apiFetch<CenturionConfig[]>("/centurions", { headers: { "x-company-id": companyId } });
}

export async function getCenturion(companyId: string, id: string) {
  return apiFetch<CenturionConfig>(`/centurions/${encodeURIComponent(id)}`, { headers: { "x-company-id": companyId } });
}

export async function createCenturion(companyId: string, input: CreateCenturionInput) {
  return apiFetch<CenturionConfig>("/centurions", {
    method: "POST",
    headers: { "x-company-id": companyId },
    body: JSON.stringify(input),
  });
}

export async function updateCenturion(companyId: string, id: string, input: UpdateCenturionInput) {
  return apiFetch<CenturionConfig>(`/centurions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "x-company-id": companyId },
    body: JSON.stringify(input),
  });
}

export async function deleteCenturion(companyId: string, id: string) {
  return apiFetch<{ ok: boolean }>(`/centurions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "x-company-id": companyId },
  });
}

export async function testCenturion(companyId: string, id: string, message: string) {
  return apiFetch<{ ok: boolean; model?: string; response: string; usage?: Record<string, unknown> }>(
    `/centurions/${encodeURIComponent(id)}/test`,
    {
      method: "POST",
      headers: { "x-company-id": companyId },
      body: JSON.stringify({ message }),
    },
  );
}

