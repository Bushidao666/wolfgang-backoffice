"use client";

import { useQuery } from "@tanstack/react-query";

import { listLeads } from "@/modules/leads/services/leads.service";

export function useLeads(companyId?: string, filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["leads", companyId, filters],
    queryFn: () => listLeads(companyId!, filters as any),
    enabled: !!companyId,
  });
}

