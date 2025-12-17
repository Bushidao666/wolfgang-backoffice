"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompanyModal } from "@/modules/empresas/components/company-modal";
import { useCompanies } from "@/modules/empresas/hooks/use-companies";
import { createCompany, updateCompany, type Company } from "@/modules/empresas/services/companies.service";

export function CompaniesList() {
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState("");
  const [draftQ, setDraftQ] = React.useState("");

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Company | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useCompanies({
    page,
    per_page: 20,
    q: q || undefined,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Empresas</CardTitle>
          <CardDescription>Gerencie tenants e provisionamento de schemas.</CardDescription>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            <Input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder="Buscar por nome..."
              className="w-full sm:w-64"
            />
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setQ(draftQ.trim());
              }}
            >
              Buscar
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => void refetch()} aria-label="Atualizar">
              <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nova empresa
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {isError ? (
          <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro ao carregar"}</p>
        ) : null}

        {data ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schema</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        Nenhuma empresa encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.data.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell className="text-muted-foreground">{company.slug}</TableCell>
                        <TableCell>{company.status}</TableCell>
                        <TableCell className="text-muted-foreground">{company.schema_name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditing(company);
                              setModalOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages} • Total: {data.total}
              </p>

              <div className="flex gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>

      <CompanyModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={editing}
        onSubmit={async (values) => {
          if (editing) {
            await updateCompany(editing.id, values);
          } else {
            await createCompany(values);
          }
          await queryClient.invalidateQueries({ queryKey: ["companies"] });
        }}
      />
    </Card>
  );
}

