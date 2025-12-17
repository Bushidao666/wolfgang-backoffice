import { apiFetch } from "@/lib/api/client";

export type FollowupRuleRow = {
  id: string;
  company_id: string;
  centurion_id: string;
  name: string;
  inactivity_hours: number;
  template: string;
  max_attempts: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateFollowupRuleInput = {
  name: string;
  inactivity_hours: number;
  template: string;
  max_attempts?: number;
  is_active?: boolean;
};

export async function listFollowupRules(companyId: string, centurionId: string) {
  return apiFetch<FollowupRuleRow[]>(`/centurions/${encodeURIComponent(centurionId)}/followup-rules`, {
    headers: { "x-company-id": companyId },
  });
}

export async function createFollowupRule(companyId: string, centurionId: string, payload: CreateFollowupRuleInput) {
  return apiFetch<FollowupRuleRow>(`/centurions/${encodeURIComponent(centurionId)}/followup-rules`, {
    method: "POST",
    headers: { "x-company-id": companyId },
    body: JSON.stringify(payload),
  });
}

export async function updateFollowupRule(companyId: string, centurionId: string, ruleId: string, payload: CreateFollowupRuleInput) {
  return apiFetch<FollowupRuleRow>(`/centurions/${encodeURIComponent(centurionId)}/followup-rules/${encodeURIComponent(ruleId)}`, {
    method: "PUT",
    headers: { "x-company-id": companyId },
    body: JSON.stringify(payload),
  });
}

export async function deleteFollowupRule(companyId: string, centurionId: string, ruleId: string) {
  return apiFetch<void>(`/centurions/${encodeURIComponent(centurionId)}/followup-rules/${encodeURIComponent(ruleId)}`, {
    method: "DELETE",
    headers: { "x-company-id": companyId },
  });
}

