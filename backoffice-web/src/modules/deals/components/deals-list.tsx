"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DealDetails } from "@/modules/deals/components/deal-details";
import { getDealStats } from "@/modules/deals/services/deals.service";
import { useDeals } from "@/modules/deals/hooks/use-deals";

export function DealsList({ companyId }: { companyId: string }) {
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<string>("");
  const dealsQuery = useDeals(companyId, { q: q.trim() || undefined, status: status || undefined });
  const deals = dealsQuery.data ?? [];
  const statsQuery = useQuery({
    queryKey: ["dealStats", companyId],
    queryFn: () => getDealStats(companyId),
    enabled: !!companyId,
    refetchInterval: 15000,
  });

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deals</CardTitle>
        <CardDescription>Negócios gerados no handoff (por schema da empresa).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {statsQuery.isLoading ? "Carregando métricas..." : statsQuery.data ? `${statsQuery.data.total} deal(s)` : "—"}
          </div>
          <div className="flex flex-wrap gap-2">
            {statsQuery.data
              ? Object.entries(statsQuery.data.by_status).map(([k, v]) => (
                  <span key={k} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {k}: <span className="text-foreground">{v}</span>
                  </span>
                ))
              : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="q">
              Busca
            </label>
            <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="nome, telefone, email" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="status">
              Status
            </label>
            <Input id="status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="ex: negocio_novo" />
          </div>
          <div className="flex items-end justify-end">
            <Button variant="outline" onClick={() => dealsQuery.refetch()} disabled={dealsQuery.isFetching}>
              {dealsQuery.isFetching ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>
        </div>

        <Separator />

        {statsQuery.isError ? (
          <p className="text-sm text-destructive">
            {statsQuery.error instanceof Error ? statsQuery.error.message : "Erro ao carregar métricas"}
          </p>
        ) : null}

        {dealsQuery.isError ? (
          <p className="text-sm text-destructive">
            {dealsQuery.error instanceof Error ? dealsQuery.error.message : "Erro ao carregar deals"}
          </p>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.deal_full_name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.deal_phone ?? "—"}</TableCell>
                  <TableCell>{d.deal_status ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedId(d.id);
                        setDetailsOpen(true);
                      }}
                    >
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!deals.length && !dealsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum deal encontrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <DealDetails open={detailsOpen} onOpenChange={setDetailsOpen} companyId={companyId} dealId={selectedId} />
      </CardContent>
    </Card>
  );
}
