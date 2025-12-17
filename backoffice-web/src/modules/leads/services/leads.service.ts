import { apiFetch } from "@/lib/api/client";

export type LeadRow = {
  id: string;
  company_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  lifecycle_stage: string;
  is_qualified: boolean;
  qualification_score: number | null;
  created_at: string;
  updated_at: string;
};

export type LeadListResponse = {
  page: number;
  per_page: number;
  total: number;
  data: LeadRow[];
};

export type LeadTimelineMessage = {
  id: string;
  conversation_id: string;
  direction: string;
  content_type: string;
  content: string | null;
  audio_transcription?: string | null;
  image_description?: string | null;
  channel_message_id?: string | null;
  metadata?: unknown;
  created_at: string;
};

export async function listLeads(
  companyId: string,
  params: {
    status?: string;
    channel?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: number;
    per_page?: number;
  } = {},
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const query = qs.toString();
  return apiFetch<LeadListResponse>(`/leads${query ? `?${query}` : ""}`, { headers: { "x-company-id": companyId } });
}

export async function getLead(companyId: string, leadId: string) {
  return apiFetch<Record<string, unknown>>(`/leads/${encodeURIComponent(leadId)}`, { headers: { "x-company-id": companyId } });
}

export async function getLeadTimeline(companyId: string, leadId: string, params: { limit?: number; offset?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return apiFetch<{
    lead_id: string;
    company_id: string;
    total: number;
    limit: number;
    offset: number;
    messages: LeadTimelineMessage[];
  }>(`/leads/${encodeURIComponent(leadId)}/timeline${query ? `?${query}` : ""}`, { headers: { "x-company-id": companyId } });
}

