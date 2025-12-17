"use client";

import { useQuery } from "@tanstack/react-query";

import { listDeals } from "@/modules/deals/services/deals.service";

export function useDeals(companyId?: string, params: { status?: string; q?: string } = {}) {
  return useQuery({
    queryKey: ["deals", companyId, params],
    queryFn: () => {
      if (!companyId) return [];
      return listDeals(companyId, params);
    },
    enabled: !!companyId,
  });
}

