"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";

import { getSessionTokens } from "@/lib/auth/session";
import {
  getMetricsByCenturion,
  getMetricsConversion,
  getMetricsSummary,
  getMetricsTimeline,
} from "@/modules/metricas/services/metrics.service";

function getWsUrl() {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") return null;
  return "http://localhost:4000";
}

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

    const wsUrl = getWsUrl();
    if (!wsUrl) return;

    const socket: Socket = io(wsUrl, {
      path: "/ws",
      transports: ["websocket"],
      auth: { token: session.accessToken, company_id: companyId },
    });

    const onInvalidate = () => {
      void summary.refetch();
      void conversion.refetch();
      void byCenturion.refetch();
      void timeline.refetch();
    };

    socket.on("metrics.invalidate", onInvalidate);

    return () => {
      socket.off("metrics.invalidate", onInvalidate);
      socket.disconnect();
    };
  }, [byCenturion, companyId, conversion, summary, timeline]);

  return { summary, conversion, byCenturion, timeline };
}
