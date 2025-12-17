"use client";

import { useQuery } from "@tanstack/react-query";

import { listDocuments } from "@/modules/knowledge-base/services/kb.service";

export function useKbDocuments(companyId?: string) {
  return useQuery({
    queryKey: ["knowledgeBaseDocuments", companyId],
    queryFn: () => {
      if (!companyId) return [];
      return listDocuments(companyId);
    },
    enabled: !!companyId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.length) return false;
      const hasPending = data.some((d) => d.status === "uploaded" || d.status === "processing");
      return hasPending ? 5000 : false;
    },
  });
}
