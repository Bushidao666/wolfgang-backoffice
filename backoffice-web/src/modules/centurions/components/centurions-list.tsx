"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCenturions } from "@/modules/centurions/hooks/use-centurions";

export function CenturionsList({ companyId }: { companyId: string }) {
  const router = useRouter();
  const centurionsQuery = useCenturions(companyId);
  const centurions = centurionsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Centurions</CardTitle>
        <CardDescription>Gestão de configuração dos SDRs por empresa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {centurionsQuery.isLoading ? "Carregando..." : `${centurions.length} centurion(s)`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => centurionsQuery.refetch()} disabled={centurionsQuery.isFetching}>
              {centurionsQuery.isFetching ? "Atualizando..." : "Atualizar"}
            </Button>
            <Button onClick={() => router.push(`/centurions/new?company_id=${encodeURIComponent(companyId)}`)}>
              Novo centurion
            </Button>
          </div>
        </div>

        <Separator />

        {centurionsQuery.isError ? (
          <p className="text-sm text-destructive">
            {centurionsQuery.error instanceof Error ? centurionsQuery.error.message : "Erro ao carregar centurions"}
          </p>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centurions.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.slug}</TableCell>
                  <TableCell>{c.is_active ? "Ativo" : "Inativo"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/centurions/${encodeURIComponent(c.id)}?company_id=${encodeURIComponent(companyId)}`)}
                    >
                      Abrir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!centurions.length && !centurionsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum centurion encontrado.
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

