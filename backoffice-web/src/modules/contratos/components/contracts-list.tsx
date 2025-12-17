"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContractStatus } from "@/modules/contratos/components/contract-status";
import { getContractDownloadUrl, listContracts } from "@/modules/contratos/services/contracts.service";

export function ContractsList({ companyId }: { companyId: string }) {
  const contractsQuery = useQuery({
    queryKey: ["contracts", companyId],
    queryFn: () => listContracts(companyId),
    enabled: !!companyId,
    refetchInterval: 10000,
  });

  const contracts = contractsQuery.data ?? [];
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const onDownload = React.useCallback(
    async (contractId: string) => {
      setDownloadingId(contractId);
      setActionError(null);
      try {
        const { url } = await getContractDownloadUrl(companyId, contractId);
        window.open(url, "_blank", "noreferrer");
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Falha ao obter link");
      } finally {
        setDownloadingId(null);
      }
    },
    [companyId],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contratos</CardTitle>
        <CardDescription>Instâncias de contrato (core.contracts).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">{contractsQuery.isLoading ? "Carregando..." : `${contracts.length} contrato(s)`}</div>
        <Separator />
        {contractsQuery.isError ? (
          <p className="text-sm text-destructive">
            {contractsQuery.error instanceof Error ? contractsQuery.error.message : "Erro ao carregar contratos"}
          </p>
        ) : null}
        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Assinado</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.id}</TableCell>
                  <TableCell>
                    <ContractStatus status={c.status} />
                  </TableCell>
                  <TableCell>{c.value ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.signed_at ? new Date(c.signed_at).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {c.contract_url ? (
                        <Button size="sm" variant="outline" onClick={() => window.open(c.contract_url!, "_blank", "noreferrer")}>
                          Abrir
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant={c.status === "signed" ? "default" : "secondary"}
                        disabled={downloadingId === c.id}
                        onClick={() => onDownload(c.id)}
                      >
                        {downloadingId === c.id ? "..." : c.status === "signed" ? "Download" : "Link"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!contracts.length && !contractsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum contrato ainda.
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
