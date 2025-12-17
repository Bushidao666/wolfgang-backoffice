"use client";

import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricsSummary } from "@/modules/metricas/services/metrics.service";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function MetricsCards({ summary }: { summary: MetricsSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Leads</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{summary.total_leads}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Qualificados</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{summary.qualified_leads}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Conversão</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{formatPercent(summary.conversion_rate)}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Tempo médio p/ qualificar</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{formatDuration(summary.avg_qualification_seconds)}</CardContent>
      </Card>
    </div>
  );
}

