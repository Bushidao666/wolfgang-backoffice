"use client";

import { useQuery } from "@tanstack/react-query";

import { listTools } from "@/modules/centurions/tools/services/tools.service";

export function useTools(companyId?: string, centurionId?: string) {
  return useQuery({
    queryKey: ["tools", companyId, centurionId],
    queryFn: () => {
      if (!companyId || !centurionId) return [];
      return listTools(companyId, centurionId);
    },
    enabled: !!companyId && !!centurionId,
  });
}

