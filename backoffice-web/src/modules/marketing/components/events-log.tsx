"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPixelEvents, listPixels } from "@/modules/marketing/services/pixels.service";

export function EventsLog({ companyId }: { companyId: string }) {
  const pixelsQuery = useQuery({
    queryKey: ["pixels", companyId, "forEvents"],
    queryFn: () => listPixels(companyId),
    enabled: !!companyId,
  });

  const pixels = pixelsQuery.data ?? [];
  const [pixelConfigId, setPixelConfigId] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("");

  React.useEffect(() => {
    if (!pixelConfigId && pixels.length) setPixelConfigId(String(pixels[0].id));
  }, [pixelConfigId, pixels]);

  const eventsQuery = useQuery({
    queryKey: ["capiLogs", companyId, pixelConfigId, status],
    queryFn: () => listPixelEvents(companyId, pixelConfigId, { status: status || undefined }),
    enabled: !!companyId && !!pixelConfigId,
    refetchInterval: 15000,
  });

  const logs = eventsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos (log)</CardTitle>
        <CardDescription>Envios ao Facebook CAPI (core.capi_event_logs).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="pixelConfig">
              Pixel
            </label>
            <select
              id="pixelConfig"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={pixelConfigId}
              onChange={(e) => setPixelConfigId(e.target.value)}
              disabled={pixelsQuery.isLoading || pixelsQuery.isError || !pixels.length}
            >
              {pixels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pixel_id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="status">
              Status
            </label>
            <Input id="status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="pending|sent|failed|retrying" />
          </div>
          <div className="flex items-end justify-end">
            <Button variant="outline" onClick={() => eventsQuery.refetch()} disabled={eventsQuery.isFetching}>
              {eventsQuery.isFetching ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>
        </div>

        <Separator />

        {eventsQuery.isError ? (
          <p className="text-sm text-destructive">{eventsQuery.error instanceof Error ? eventsQuery.error.message : "Erro ao carregar logs"}</p>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead>Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.event_name}</TableCell>
                  <TableCell>{l.status}</TableCell>
                  <TableCell>{l.attempts}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">{l.error_message ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {!logs.length && !eventsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum evento encontrado.
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

