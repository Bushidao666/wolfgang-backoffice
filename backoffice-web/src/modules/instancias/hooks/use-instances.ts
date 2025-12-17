"use client";

import { useQuery } from "@tanstack/react-query";

import { listInstances } from "@/modules/instancias/services/instances.service";

export function useInstances(companyId?: string) {
  return useQuery({
    queryKey: ["instances", companyId],
    queryFn: () => {
      if (!companyId) return [];
      return listInstances(companyId);
    },
    enabled: !!companyId,
    refetchInterval: 5000,
  });
}

