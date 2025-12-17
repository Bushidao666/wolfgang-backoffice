import { apiFetch } from "@/lib/api/client";

export type ContractTemplateRow = {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  variables: unknown[] | null;
  category: string | null;
  is_active: boolean;
  file_path: string | null;
  file_type: string | null;
  created_at: string;
  updated_at: string;
};

export type ContractRow = {
  id: string;
  company_id: string;
  lead_id: string | null;
  deal_index_id: string | null;
  template_id: string;
  status: string;
  contract_url: string | null;
  autentique_id: string | null;
  contract_data: Record<string, unknown>;
  value: number | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listContractTemplates(companyId: string) {
  return apiFetch<ContractTemplateRow[]>("/contracts/templates", { headers: { "x-company-id": companyId } });
}

export async function createContractTemplate(companyId: string, payload: { name: string; description?: string; category?: string; variables?: string }, file: File) {
  const form = new FormData();
  form.append("name", payload.name);
  if (payload.description) form.append("description", payload.description);
  if (payload.category) form.append("category", payload.category);
  if (payload.variables) form.append("variables", payload.variables);
  form.append("file", file);

  return apiFetch<ContractTemplateRow>("/contracts/templates", {
    method: "POST",
    headers: { "x-company-id": companyId },
    body: form,
  });
}

export async function deleteContractTemplate(companyId: string, templateId: string) {
  return apiFetch<void>(`/contracts/templates/${encodeURIComponent(templateId)}`, { method: "DELETE", headers: { "x-company-id": companyId } });
}

export async function listContracts(companyId: string) {
  return apiFetch<ContractRow[]>("/contracts", { headers: { "x-company-id": companyId } });
}

export async function createContract(
  companyId: string,
  payload: {
    template_id: string;
    deal_id: string;
    value?: number;
    currency?: string;
    signer_name?: string;
    signer_email?: string;
    signer_phone?: string;
    contract_data?: Record<string, unknown>;
  },
) {
  return apiFetch<ContractRow>("/contracts", {
    method: "POST",
    headers: { "x-company-id": companyId },
    body: JSON.stringify(payload),
  });
}

export async function getContractDownloadUrl(companyId: string, contractId: string) {
  return apiFetch<{ url: string }>(`/contracts/${encodeURIComponent(contractId)}/download`, {
    headers: { "x-company-id": companyId },
  });
}
