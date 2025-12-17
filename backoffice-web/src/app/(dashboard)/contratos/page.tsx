"use client";

import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/hooks";
import { useCompanies } from "@/modules/empresas/hooks/use-companies";
import { ContractTemplates } from "@/modules/contratos/components/contract-templates";
import { CreateContract } from "@/modules/contratos/components/create-contract";
import { ContractsList } from "@/modules/contratos/components/contracts-list";

function isHoldingAdmin(role?: string) {
  return role === "super_admin" || role === "backoffice_admin";
}

export default function ContratosPage() {
  const { user, loading } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | undefined>(undefined);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contratos</CardTitle>
          <CardDescription>Templates e instâncias de contrato (Autentique).</CardDescription>
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

      {selectedCompanyId ? (
        <div className="space-y-6">
          <CreateContract companyId={selectedCompanyId} />
          <div className="grid gap-6 lg:grid-cols-2">
            <ContractTemplates companyId={selectedCompanyId} />
            <ContractsList companyId={selectedCompanyId} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
