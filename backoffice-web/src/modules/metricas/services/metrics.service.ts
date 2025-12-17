import { apiFetch } from "@/lib/api/client";

export type MetricsSummary = {
  company_id: string;
  from: string;
  to: string;
  total_leads: number;
  by_stage: Record<string, number>;
  qualified_leads: number;
  conversion_rate: number;
  avg_qualification_seconds: number;
};

export type MetricsConversion = {
  company_id: string;
  from: string;
  to: string;
  funnel: Record<string, number>;
};

export type MetricsByCenturion = {
  company_id: string;
  from: string;
  to: string;
  items: Array<{
    centurion_id: string;
    centurion_name: string;
    total_leads: number;
    qualified_leads: number;
    conversion_rate: number;
  }>;
};

export type MetricsTimeline = {
  company_id: string;
  from: string;
  to: string;
  points: Array<{ date: string; leads_created: number; leads_qualified: number; contracts_signed: number }>;
};

export async function getMetricsSummary(companyId: string, params: { from?: string; to?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const query = qs.toString();
  return apiFetch<MetricsSummary>(`/metrics/summary${query ? `?${query}` : ""}`, { headers: { "x-company-id": companyId } });
}

export async function getMetricsConversion(companyId: string, params: { from?: string; to?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const query = qs.toString();
  return apiFetch<MetricsConversion>(`/metrics/conversion${query ? `?${query}` : ""}`, { headers: { "x-company-id": companyId } });
}

export async function getMetricsByCenturion(companyId: string, params: { from?: string; to?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const query = qs.toString();
  return apiFetch<MetricsByCenturion>(`/metrics/by-centurion${query ? `?${query}` : ""}`, { headers: { "x-company-id": companyId } });
}

export async function getMetricsTimeline(companyId: string, params: { from?: string; to?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const query = qs.toString();
  return apiFetch<MetricsTimeline>(`/metrics/timeline${query ? `?${query}` : ""}`, { headers: { "x-company-id": companyId } });
}

