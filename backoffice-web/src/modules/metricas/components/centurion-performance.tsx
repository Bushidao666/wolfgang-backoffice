"use client";

import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MetricsByCenturion } from "@/modules/metricas/services/metrics.service";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function CenturionPerformance({ byCenturion }: { byCenturion: MetricsByCenturion }) {
  const rows = React.useMemo(() => byCenturion.items ?? [], [byCenturion.items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Centurion</CardTitle>
        <CardDescription>Comparativo por bot (volume e conversão).</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Centurion</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Qualificados</TableHead>
                <TableHead>Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.centurion_id}>
                  <TableCell className="font-medium">{r.centurion_name}</TableCell>
                  <TableCell>{r.total_leads}</TableCell>
                  <TableCell>{r.qualified_leads}</TableCell>
                  <TableCell>{formatPercent(r.conversion_rate)}</TableCell>
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Sem dados no período selecionado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

