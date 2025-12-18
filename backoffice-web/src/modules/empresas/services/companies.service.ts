import { apiFetch } from "@/lib/api/client";

export type Company = {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  status: "active" | "suspended" | "archived";
  schema_name: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PaginatedCompanies = {
  data: Company[];
  page: number;
  per_page: number;
  total: number;
};

export type CompanyIntegrationProvider = "autentique" | "evolution" | "openai";
export type CompanyIntegrationMode = "global" | "custom" | "disabled";

export type CreateCompanyIntegration = {
  provider: CompanyIntegrationProvider;
  mode: CompanyIntegrationMode;
  credential_set_id?: string;
  config_override?: Record<string, unknown>;
  secrets_override?: Record<string, unknown>;
};

export async function listCompanies(params: { page?: number; per_page?: number; q?: string; status?: string }) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.per_page) search.set("per_page", String(params.per_page));
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);

  const qs = search.toString();
  return apiFetch<PaginatedCompanies>(`/companies${qs ? `?${qs}` : ""}`);
}

export async function createCompany(input: {
  name: string;
  document?: string;
  settings?: Record<string, unknown>;
  integrations?: CreateCompanyIntegration[];
}) {
  return apiFetch<Company>("/companies", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCompany(
  id: string,
  input: { name?: string; document?: string; status?: Company["status"]; settings?: Record<string, unknown> },
) {
  return apiFetch<Company>(`/companies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
