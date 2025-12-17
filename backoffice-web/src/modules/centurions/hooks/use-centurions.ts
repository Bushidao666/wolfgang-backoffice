"use client";

import { useQuery } from "@tanstack/react-query";

import { listCenturions } from "@/modules/centurions/services/centurions.service";

export function useCenturions(companyId?: string) {
  return useQuery({
    queryKey: ["centurions", companyId],
    queryFn: () => listCenturions(companyId!),
    enabled: !!companyId,
  });
}

