"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricsConversion } from "@/modules/metricas/services/metrics.service";

export function ConversionChart({ conversion }: { conversion: MetricsConversion }) {
  const data = React.useMemo(
    () =>
      Object.entries(conversion.funnel)
        .map(([stage, count]) => ({ stage, count }))
        .sort((a, b) => b.count - a.count),
    [conversion.funnel],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil (por status)</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" tick={{ fontSize: 12 }} interval={0} angle={-25} height={60} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

