"use client";

import { useQuery } from "@tanstack/react-query";

import { listFollowupRules } from "@/modules/centurions/followups/services/followups.service";

export function useFollowupRules(companyId?: string, centurionId?: string) {
  return useQuery({
    queryKey: ["followupRules", companyId, centurionId],
    queryFn: () => {
      if (!companyId || !centurionId) return [];
      return listFollowupRules(companyId, centurionId);
    },
    enabled: !!companyId && !!centurionId,
  });
}

