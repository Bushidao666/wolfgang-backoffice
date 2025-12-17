"use client";

import { useQuery } from "@tanstack/react-query";

import { listMcpServers } from "@/modules/centurions/mcp/services/mcp.service";

export function useMcpServers(companyId?: string, centurionId?: string) {
  return useQuery({
    queryKey: ["mcpServers", companyId, centurionId],
    queryFn: () => {
      if (!companyId || !centurionId) return [];
      return listMcpServers(companyId, centurionId);
    },
    enabled: !!companyId && !!centurionId,
  });
}

