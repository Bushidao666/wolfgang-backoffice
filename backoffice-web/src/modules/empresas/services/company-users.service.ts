import { apiFetch } from "@/lib/api/client";

export type CompanyUserRole =
  | "owner"
  | "admin"
  | "operator"
  | "viewer"
  | "sales_rep"
  | "super_admin"
  | "backoffice_admin";

export type CompanyUser = {
  user_id: string;
  email: string | null;
  role: CompanyUserRole;
  scopes: string[];
};

export async function listCompanyUsers(companyId: string) {
  return apiFetch<{ company_id: string; users: CompanyUser[] }>(`/companies/${encodeURIComponent(companyId)}/users`);
}

export async function addCompanyUser(
  companyId: string,
  payload: { email: string; role?: CompanyUserRole; scopes?: string[] },
) {
  return apiFetch<{
    id: string;
    company_id: string;
    user_id: string;
    role: CompanyUserRole;
    scopes: string[];
    email: string | null;
  }>(`/companies/${encodeURIComponent(companyId)}/users`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeCompanyUser(companyId: string, userId: string) {
  return apiFetch<void>(`/companies/${encodeURIComponent(companyId)}/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

