import { apiFetch } from "@/lib/api/client";

export type PixelConfig = {
  id: string;
  company_id: string;
  pixel_id: string;
  meta_test_event_code: string | null;
  domain: string | null;
  is_active: boolean;
  has_access_token: boolean;
  created_at: string;
  updated_at: string;
};

export type CapiEventLog = {
  id: string;
  company_id: string;
  pixel_id: string;
  event_name: string;
  event_time: string;
  status: string;
  attempts: number;
  last_attempt_at: string | null;
  fb_trace_id: string | null;
  error_message: string | null;
  error_code: string | null;
  source_event: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function listPixels(companyId: string) {
  return apiFetch<PixelConfig[]>("/pixels", { headers: { "x-company-id": companyId } });
}

export async function createPixel(
  companyId: string,
  payload: { pixel_id: string; meta_access_token: string; meta_test_event_code?: string; domain?: string; is_active?: boolean },
) {
  return apiFetch<PixelConfig>("/pixels", { method: "POST", headers: { "x-company-id": companyId }, body: JSON.stringify(payload) });
}

export async function updatePixel(
  companyId: string,
  id: string,
  payload: { pixel_id?: string; meta_access_token?: string; meta_test_event_code?: string; domain?: string; is_active?: boolean },
) {
  return apiFetch<PixelConfig>(`/pixels/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "x-company-id": companyId }, body: JSON.stringify(payload) });
}

export async function deletePixel(companyId: string, id: string) {
  return apiFetch<void>(`/pixels/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "x-company-id": companyId } });
}

export async function testPixel(companyId: string, id: string) {
  return apiFetch<{ ok: boolean; payload: unknown }>(`/pixels/${encodeURIComponent(id)}/test`, { method: "POST", headers: { "x-company-id": companyId } });
}

export async function listPixelEvents(companyId: string, pixelConfigId: string, filters: { status?: string; from?: string; to?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  const query = qs.toString();
  return apiFetch<CapiEventLog[]>(`/pixels/${encodeURIComponent(pixelConfigId)}/events${query ? `?${query}` : ""}`, { headers: { "x-company-id": companyId } });
}

