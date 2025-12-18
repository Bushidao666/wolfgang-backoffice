"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";

import { getSessionTokens } from "@/lib/auth/session";
import { resolveApiUrl } from "@/lib/runtime-config";
import {
  getMetricsByCenturion,
  getMetricsConversion,
  getMetricsSummary,
  getMetricsTimeline,
} from "@/modules/metricas/services/metrics.service";

export function useMetrics(companyId?: string, range: { from?: string; to?: string } = {}) {
  const summary = useQuery({
    queryKey: ["metrics", "summary", companyId, range.from, range.to],
    queryFn: () => getMetricsSummary(companyId!, range),
    enabled: !!companyId,
  });

  const conversion = useQuery({
    queryKey: ["metrics", "conversion", companyId, range.from, range.to],
    queryFn: () => getMetricsConversion(companyId!, range),
    enabled: !!companyId,
  });

  const byCenturion = useQuery({
    queryKey: ["metrics", "by-centurion", companyId, range.from, range.to],
    queryFn: () => getMetricsByCenturion(companyId!, range),
    enabled: !!companyId,
  });

  const timeline = useQuery({
    queryKey: ["metrics", "timeline", companyId, range.from, range.to],
    queryFn: () => getMetricsTimeline(companyId!, range),
    enabled: !!companyId,
  });

  React.useEffect(() => {
    if (!companyId) return;
    const session = getSessionTokens();
    if (!session?.accessToken) return;

    let socket: Socket | null = null;
    let cancelled = false;

    const onInvalidate = () => {
      void summary.refetch();
      void conversion.refetch();
      void byCenturion.refetch();
      void timeline.refetch();
    };

    void (async () => {
      try {
        const wsUrl = await resolveApiUrl();
        if (cancelled) return;
        socket = io(wsUrl, {
          path: "/ws",
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 500,
          reconnectionDelayMax: 5000,
          timeout: 10_000,
          auth: { token: session.accessToken, company_id: companyId },
        });
        socket.on("metrics.invalidate", onInvalidate);
      } catch {
        // ignore ws failures (metrics still work via polling/refetch)
      }
    })();

    return () => {
      cancelled = true;
      if (!socket) return;
      socket.off("metrics.invalidate", onInvalidate);
      socket.disconnect();
    };
  }, [byCenturion, companyId, conversion, summary, timeline]);

  return { summary, conversion, byCenturion, timeline };
}
