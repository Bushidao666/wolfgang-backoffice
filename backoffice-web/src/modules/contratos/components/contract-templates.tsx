"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createContractTemplate, deleteContractTemplate, listContractTemplates } from "@/modules/contratos/services/contracts.service";

export function ContractTemplates({ companyId }: { companyId: string }) {
  const templatesQuery = useQuery({
    queryKey: ["contractTemplates", companyId],
    queryFn: () => listContractTemplates(companyId),
    enabled: !!companyId,
  });

  const templates = templatesQuery.data ?? [];
  const [modalOpen, setModalOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("general");
  const [variables, setVariables] = React.useState("[]");
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const resetForm = React.useCallback(() => {
    setName("");
    setDescription("");
    setCategory("general");
    setVariables("[]");
    setFile(null);
    setError(null);
  }, []);

  const onCreate = React.useCallback(async () => {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      await createContractTemplate(
        companyId,
        {
          name: name.trim(),
          description: description.trim() ? description.trim() : undefined,
          category: category.trim() ? category.trim() : undefined,
          variables,
        },
        file,
      );
      await templatesQuery.refetch();
      resetForm();
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar template");
    } finally {
      setSaving(false);
    }
  }, [category, companyId, description, file, name, resetForm, templatesQuery, variables]);

  const onDelete = React.useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteContractTemplate(companyId, id);
        await templatesQuery.refetch();
      } finally {
        setDeletingId(null);
      }
    },
    [companyId, templatesQuery],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Templates</CardTitle>
        <CardDescription>Templates por empresa (e globais), com upload de arquivo base.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {templatesQuery.isLoading ? "Carregando..." : `${templates.length} template(s)`}
          </div>
          <Button onClick={() => setModalOpen(true)}>Novo template</Button>
        </div>

        <Separator />

        {templatesQuery.isError ? (
          <p className="text-sm text-destructive">
            {templatesQuery.error instanceof Error ? templatesQuery.error.message : "Erro ao carregar templates"}
          </p>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.category ?? "general"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.company_id ? "empresa" : "global"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.file_type ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="destructive" disabled={deletingId === t.id} onClick={() => onDelete(t.id)}>
                      {deletingId === t.id ? "Removendo..." : "Remover"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!templates.length && !templatesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum template cadastrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <Dialog
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Novo template</DialogTitle>
              <DialogDescription>Suba um arquivo base e declare variáveis (JSON).</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contrato padrão" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="variables">Variáveis (JSON)</Label>
                <textarea
                  id="variables"
                  className="min-h-28 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                  value={variables}
                  onChange={(e) => setVariables(e.target.value)}
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">Ex: [{"{"}\"name\":\"deal_full_name\",\"type\":\"string\",\"required\":true{"}"}]</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Arquivo (PDF/DOCX/TXT)</Label>
                <Input id="file" type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={onCreate} disabled={!file || !name.trim() || saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

