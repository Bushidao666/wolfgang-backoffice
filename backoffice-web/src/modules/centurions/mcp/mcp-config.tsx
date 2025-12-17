"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { McpServerForm } from "@/modules/centurions/mcp/mcp-server-form";
import { useMcpServers } from "@/modules/centurions/mcp/hooks/use-mcp-servers";
import { deleteMcpServer, type McpServerRow } from "@/modules/centurions/mcp/services/mcp.service";

function countTools(server: McpServerRow) {
  return Array.isArray(server.tools_available) ? server.tools_available.length : 0;
}

export function McpConfig({ companyId, centurionId }: { companyId: string; centurionId: string }) {
  const serversQuery = useMcpServers(companyId, centurionId);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const servers = serversQuery.data ?? [];

  const onSaved = React.useCallback(() => {
    void serversQuery.refetch();
  }, [serversQuery]);

  const onDelete = React.useCallback(
    async (serverId: string) => {
      setDeletingId(serverId);
      try {
        await deleteMcpServer(companyId, centurionId, serverId);
        await serversQuery.refetch();
      } finally {
        setDeletingId(null);
      }
    },
    [centurionId, companyId, serversQuery],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP Servers</CardTitle>
        <CardDescription>Conecte servidores MCP para expandir as tools disponíveis ao Centurion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {serversQuery.isLoading ? "Carregando..." : `${servers.length} server(s)`}
          </div>
          <Button onClick={() => setModalOpen(true)}>Adicionar</Button>
        </div>

        <Separator />

        {serversQuery.isError ? (
          <p className="text-sm text-destructive">
            {serversQuery.error instanceof Error ? serversQuery.error.message : "Erro ao carregar MCP servers"}
          </p>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((s) => (
                <React.Fragment key={s.id}>
                  <TableRow>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="max-w-[360px] truncate text-xs text-muted-foreground">{s.server_url}</TableCell>
                    <TableCell>{s.connection_status ?? "unknown"}</TableCell>
                    <TableCell>{countTools(s)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                          {expandedId === s.id ? "Ocultar" : "Ver tools"}
                        </Button>
                        <Button size="sm" variant="destructive" disabled={deletingId === s.id} onClick={() => onDelete(s.id)}>
                          {deletingId === s.id ? "Removendo..." : "Remover"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === s.id ? (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/30">
                        {s.last_error ? <p className="mb-2 text-xs text-destructive">Último erro: {s.last_error}</p> : null}
                        <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 text-xs">
                          {JSON.stringify(s.tools_available ?? [], null, 2)}
                        </pre>
                        <p className="mt-2 text-xs text-muted-foreground">
                          A lista de tools é atualizada automaticamente quando o Agent Runtime faz discovery.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              ))}
              {!servers.length && !serversQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum MCP server configurado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <McpServerForm open={modalOpen} onOpenChange={setModalOpen} companyId={companyId} centurionId={centurionId} onSaved={onSaved} />
      </CardContent>
    </Card>
  );
}

