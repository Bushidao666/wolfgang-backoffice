"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CredentialSetModal } from "@/modules/integracoes/components/credential-set-modal";
import {
  createCredentialSet,
  deleteCredentialSet,
  listCredentialSets,
  setCredentialSetDefault,
  updateCredentialSet,
  type CredentialSet,
  type IntegrationProvider,
} from "@/modules/integracoes/services/integrations.service";

const providers: { value: IntegrationProvider; label: string }[] = [
  { value: "autentique", label: "Autentique" },
  { value: "evolution", label: "Evolution" },
  { value: "openai", label: "OpenAI" },
];

export function CredentialSetsManager() {
  const queryClient = useQueryClient();
  const setsQuery = useQuery({
    queryKey: ["integrations", "credential-sets"],
    queryFn: () => listCredentialSets(),
  });

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CredentialSet | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const byProvider = React.useMemo(() => {
    const map: Record<string, CredentialSet[]> = {};
    for (const p of providers) map[p.value] = [];
    for (const s of setsQuery.data ?? []) {
      map[s.provider] ??= [];
      map[s.provider].push(s);
    }
    return map;
  }, [setsQuery.data]);

  const invalidate = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["integrations", "credential-sets"] });
  }, [queryClient]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Integrações</CardTitle>
            <CardDescription>Gerencie credenciais globais (reutilizáveis por empresas).</CardDescription>
          </div>

          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nova credencial
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {setsQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
          {setsQuery.isError ? (
            <p className="text-sm text-destructive">
              {setsQuery.error instanceof Error ? setsQuery.error.message : "Erro ao carregar credenciais"}
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {providers.map((p) => (
            <div key={p.value} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{p.label}</h3>
                <p className="text-xs text-muted-foreground">{(byProvider[p.value] ?? []).length} set(s)</p>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Segredos</TableHead>
                      <TableHead>Atualizado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(byProvider[p.value] ?? []).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.is_default ? "sim" : "não"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.has_secrets ? "configurado" : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(s.updated_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditing(s);
                                setModalOpen(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === s.id || s.is_default}
                              onClick={async () => {
                                setBusyId(s.id);
                                setError(null);
                                try {
                                  await setCredentialSetDefault(s.id);
                                  await invalidate();
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : "Falha ao marcar default");
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                            >
                              Default
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busyId === s.id}
                              onClick={async () => {
                                if (!confirm(`Remover credencial "${s.name}"?`)) return;
                                setBusyId(s.id);
                                setError(null);
                                try {
                                  await deleteCredentialSet(s.id);
                                  await invalidate();
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : "Falha ao remover credencial");
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                            >
                              Remover
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!(byProvider[p.value] ?? []).length && !setsQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                          Nenhuma credencial cadastrada.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>

      <CredentialSetModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing}
        onSubmit={async (payload) => {
          if (editing) {
            const patch: Record<string, unknown> = {
              name: payload.name,
              is_default: payload.is_default,
              config: payload.config,
            };
            if (payload.secrets) patch.secrets = payload.secrets;
            await updateCredentialSet(editing.id, patch as any);
          } else {
            await createCredentialSet(payload as any);
          }
          await invalidate();
        }}
      />
    </div>
  );
}

