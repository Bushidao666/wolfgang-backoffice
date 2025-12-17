import { useQuery } from "@tanstack/react-query";

import { listCompanies } from "@/modules/empresas/services/companies.service";

export function useCompanies(params: { page: number; per_page: number; q?: string; status?: string }) {
  return useQuery({
    queryKey: ["companies", params],
    queryFn: () => listCompanies(params),
  });
}

