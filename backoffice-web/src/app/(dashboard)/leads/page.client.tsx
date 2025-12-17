"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/hooks";
import { useCompanies } from "@/modules/empresas/hooks/use-companies";
import { LeadsList } from "@/modules/leads/components/leads-list";

function isHoldingAdmin(role?: string) {
  return role === "super_admin" || role === "backoffice_admin";
}

export default function LeadsPageClient() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const companyFromQuery = searchParams.get("company_id") ?? undefined;
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | undefined>(companyFromQuery);

  const canPickCompany = isHoldingAdmin(user?.role);
  const companiesQuery = useCompanies({ page: 1, per_page: 200 });

  React.useEffect(() => {
    if (companyFromQuery) setSelectedCompanyId(companyFromQuery);
  }, [companyFromQuery]);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>Gestão de leads e timeline de conversas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {canPickCompany ? (
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
          ) : (
            <p className="text-sm text-muted-foreground">Empresa: {selectedCompanyId ?? "—"}</p>
          )}

          {companiesQuery.isError ? (
            <p className="text-sm text-destructive">
              {companiesQuery.error instanceof Error ? companiesQuery.error.message : "Erro ao carregar empresas"}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {selectedCompanyId ? <LeadsList companyId={selectedCompanyId} /> : null}
    </div>
  );
}

