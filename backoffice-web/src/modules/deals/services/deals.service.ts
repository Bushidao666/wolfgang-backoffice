import { apiFetch } from "@/lib/api/client";

export type DealRow = {
  id: string;
  company_id: string;
  core_lead_id: string;
  deal_full_name: string | null;
  deal_phone: string | null;
  deal_email: string | null;
  deal_status: string | null;
  deal_servico: string | null;
  deal_valor_contrato: number | null;
  created_at: string;
  updated_at: string;
};

export async function listDeals(companyId: string, params: { status?: string; q?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);
  const query = qs.toString();
  return apiFetch<DealRow[]>(`/deals${query ? `?${query}` : ""}`, { headers: { "x-company-id": companyId } });
}

export async function getDeal(companyId: string, dealId: string) {
  return apiFetch<Record<string, unknown>>(`/deals/${encodeURIComponent(dealId)}`, { headers: { "x-company-id": companyId } });
}

export async function getDealTimeline(companyId: string, dealId: string) {
  return apiFetch<{
    deal: Record<string, unknown>;
    deal_index_id: string | null;
    lead_id: string | null;
    messages: Array<{ id: string; direction: string; content_type: string; content: string | null; metadata: unknown; created_at: string }>;
    contracts: Array<{ id: string; status: string; value: number | null; signed_at: string | null; contract_url: string | null; created_at: string; updated_at: string }>;
  }>(`/deals/${encodeURIComponent(dealId)}/timeline`, { headers: { "x-company-id": companyId } });
}

export async function getDealStats(companyId: string) {
  return apiFetch<{ company_id: string; total: number; by_status: Record<string, number> }>(`/deals/stats`, {
    headers: { "x-company-id": companyId },
  });
}
