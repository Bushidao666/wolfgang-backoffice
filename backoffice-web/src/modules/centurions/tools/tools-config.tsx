"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTools } from "@/modules/centurions/tools/hooks/use-tools";
import { ToolForm } from "@/modules/centurions/tools/tool-form";
import { deleteTool, type ToolConfigRow } from "@/modules/centurions/tools/services/tools.service";

export function ToolsConfig({ companyId, centurionId }: { companyId: string; centurionId: string }) {
  const toolsQuery = useTools(companyId, centurionId);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ToolConfigRow | undefined>(undefined);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const tools = toolsQuery.data ?? [];

  const onSaved = React.useCallback(() => {
    void toolsQuery.refetch();
  }, [toolsQuery]);

  const onDelete = React.useCallback(
    async (toolId: string) => {
      setDeletingId(toolId);
      try {
        await deleteTool(companyId, centurionId, toolId);
        await toolsQuery.refetch();
      } finally {
        setDeletingId(null);
      }
    },
    [centurionId, companyId, toolsQuery],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tools</CardTitle>
        <CardDescription>Configure ferramentas HTTP que o Centurion pode chamar via function calling.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {toolsQuery.isLoading ? "Carregando..." : `${tools.length} tool(s) configurada(s)`}
          </div>
          <Button
            onClick={() => {
              setEditing(undefined);
              setModalOpen(true);
            }}
          >
            Nova tool
          </Button>
        </div>

        <Separator />

        {toolsQuery.isError ? (
          <p className="text-sm text-destructive">
            {toolsQuery.error instanceof Error ? toolsQuery.error.message : "Erro ao carregar tools"}
          </p>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.tool_name}</TableCell>
                  <TableCell className="max-w-[360px] truncate text-xs text-muted-foreground">{t.endpoint}</TableCell>
                  <TableCell>{t.method}</TableCell>
                  <TableCell>{t.is_active ? "Ativa" : "Inativa"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(t);
                          setModalOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingId === t.id}
                        onClick={() => onDelete(t.id)}
                      >
                        {deletingId === t.id ? "Removendo..." : "Remover"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!tools.length && !toolsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma tool configurada.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <ToolForm
          open={modalOpen}
          onOpenChange={setModalOpen}
          companyId={companyId}
          centurionId={centurionId}
          tool={editing}
          onSaved={onSaved}
        />
      </CardContent>
    </Card>
  );
}

