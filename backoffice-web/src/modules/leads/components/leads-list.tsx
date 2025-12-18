"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSessionTokens } from "@/lib/auth/session";
import { resolveApiUrl } from "@/lib/runtime-config";
import { LeadsFilters, type LeadFilters } from "@/modules/leads/components/leads-filters";
import { useLeads } from "@/modules/leads/hooks/use-leads";

function inferChannel(phone: string) {
  if (phone.startsWith("telegram:")) return "telegram";
  if (phone.startsWith("instagram:")) return "instagram";
  return "whatsapp";
}

export function LeadsList({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [filters, setFilters] = React.useState<LeadFilters>({ q: "", status: "", channel: "" });
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(50);
  const leadsQuery = useLeads(companyId, {
    q: filters.q?.trim() || undefined,
    status: filters.status?.trim() || undefined,
    channel: filters.channel || undefined,
    page,
    per_page: perPage,
  });

  const list = leadsQuery.data?.data ?? [];
  const total = leadsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  React.useEffect(() => {
    setPage(1);
  }, [filters.channel, filters.q, filters.status]);

  React.useEffect(() => {
    setPage(1);
  }, [perPage]);

  React.useEffect(() => {
    const session = getSessionTokens();
    if (!session?.accessToken) return;

    let socket: Socket | null = null;
    let cancelled = false;

    const onLeadChanged = () => {
      void leadsQuery.refetch();
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
        socket.on("lead.created", onLeadChanged);
        socket.on("lead.qualified", onLeadChanged);
      } catch {
        // ignore ws failures (leads list still works via polling/refetch)
      }
    })();

    return () => {
      cancelled = true;
      if (!socket) return;
      socket.off("lead.created", onLeadChanged);
      socket.off("lead.qualified", onLeadChanged);
      socket.disconnect();
    };
  }, [companyId, leadsQuery]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads</CardTitle>
        <CardDescription>Gestão de leads e histórico de conversas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LeadsFilters value={filters} onChange={setFilters} />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm text-muted-foreground" htmlFor="perPage">
              Por página
            </label>
            <select
              id="perPage"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:w-40"
              value={String(perPage)}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-medium text-foreground">{total}</span>
            </p>
          </div>

          <Button variant="outline" onClick={() => leadsQuery.refetch()} disabled={leadsQuery.isFetching}>
            {leadsQuery.isFetching ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>

        <Separator />

        {leadsQuery.isError ? (
          <p className="text-sm text-destructive">
            {leadsQuery.error instanceof Error ? leadsQuery.error.message : "Erro ao carregar leads"}
          </p>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.phone}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{inferChannel(l.phone)}</TableCell>
                  <TableCell>{l.lifecycle_stage}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/leads/${encodeURIComponent(l.id)}?company_id=${encodeURIComponent(companyId)}`)}
                    >
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!list.length && !leadsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum lead encontrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página <span className="font-medium text-foreground">{page}</span> de{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || leadsQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages || leadsQuery.isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próximo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
