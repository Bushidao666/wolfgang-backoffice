"use client";

import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/hooks";
import { useCompanies } from "@/modules/empresas/hooks/use-companies";
import { CenturionPerformance } from "@/modules/metricas/components/centurion-performance";
import { ConversionChart } from "@/modules/metricas/components/conversion-chart";
import { LeadsTimeline } from "@/modules/metricas/components/leads-timeline";
import { MetricsCards } from "@/modules/metricas/components/metrics-cards";
import { useMetrics } from "@/modules/metricas/hooks/use-metrics";

function isHoldingAdmin(role?: string) {
  return role === "super_admin" || role === "backoffice_admin";
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default function DashboardHomePage() {
  const { user, loading } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | undefined>(undefined);
  const [rangeDays, setRangeDays] = React.useState(30);

  const canPickCompany = isHoldingAdmin(user?.role);
  const companiesQuery = useCompanies({ page: 1, per_page: 200 });

  React.useEffect(() => {
    if (loading) return;
    if (!canPickCompany) {
      setSelectedCompanyId(user?.company_id);
      return;
    }
    if (!selectedCompanyId && companiesQuery.data?.data?.length) {
      setSelectedCompanyId(companiesQuery.data.data[0].id);
    }
  }, [canPickCompany, companiesQuery.data?.data, loading, selectedCompanyId, user?.company_id]);

  const range = React.useMemo(() => ({ from: isoDaysAgo(rangeDays), to: new Date().toISOString() }), [rangeDays]);
  const metrics = useMetrics(selectedCompanyId, range);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Métricas consolidadas em tempo real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {canPickCompany ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-sm text-muted-foreground" htmlFor="company">
                  Empresa
                </label>
                <select
                  id="company"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:w-96"
                  value={selectedCompanyId ?? ""}
                  onChange={(e) => setSelectedCompanyId(e.target.value || undefined)}
                  disabled={companiesQuery.isLoading || companiesQuery.isError}
                >
                  {(companiesQuery.data?.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-sm text-muted-foreground" htmlFor="range">
                  Período
                </label>
                <select
                  id="range"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:w-40"
                  value={String(rangeDays)}
                  onChange={(e) => setRangeDays(Number(e.target.value))}
                >
                  <option value="7">7 dias</option>
                  <option value="30">30 dias</option>
                  <option value="90">90 dias</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Empresa: {selectedCompanyId ?? "—"}</p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground" htmlFor="range">
                  Período
                </label>
                <select
                  id="range"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:w-40"
                  value={String(rangeDays)}
                  onChange={(e) => setRangeDays(Number(e.target.value))}
                >
                  <option value="7">7 dias</option>
                  <option value="30">30 dias</option>
                  <option value="90">90 dias</option>
                </select>
              </div>
            </div>
          )}

          {companiesQuery.isError ? (
            <p className="text-sm text-destructive">
              {companiesQuery.error instanceof Error ? companiesQuery.error.message : "Erro ao carregar empresas"}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {selectedCompanyId ? (
        <div className="space-y-6">
          {metrics.summary.data ? <MetricsCards summary={metrics.summary.data} /> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {metrics.conversion.data ? <ConversionChart conversion={metrics.conversion.data} /> : null}
            {metrics.timeline.data ? <LeadsTimeline timeline={metrics.timeline.data} /> : null}
          </div>

          {metrics.byCenturion.data ? <CenturionPerformance byCenturion={metrics.byCenturion.data} /> : null}

          {metrics.summary.isLoading || metrics.conversion.isLoading || metrics.timeline.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando métricas...</p>
          ) : null}

          {metrics.summary.isError ? (
            <p className="text-sm text-destructive">
              {metrics.summary.error instanceof Error ? metrics.summary.error.message : "Erro ao carregar summary"}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
