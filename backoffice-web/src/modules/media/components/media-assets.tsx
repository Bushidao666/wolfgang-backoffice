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
import { useCenturions } from "@/modules/centurions/hooks/use-centurions";
import { createMediaAsset, deleteMediaAsset, getMediaAssetSignedUrl, listMediaAssets, type MediaAssetRow } from "@/modules/media/services/media.service";

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let idx = 0;
  while (n >= 1024 && idx < units.length - 1) {
    n /= 1024;
    idx += 1;
  }
  return `${n.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function MediaAssets({ companyId }: { companyId: string }) {
  const assetsQuery = useQuery({
    queryKey: ["mediaAssets", companyId],
    queryFn: () => listMediaAssets(companyId),
    enabled: !!companyId,
  });
  const centurionsQuery = useCenturions(companyId);

  const assets = assetsQuery.data ?? [];
  const centurions = centurionsQuery.data ?? [];
  const centurionMap = React.useMemo(() => new Map(centurions.map((c) => [c.id, c])), [centurions]);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [scopeCenturionId, setScopeCenturionId] = React.useState<string>(""); // empty = global
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const resetForm = React.useCallback(() => {
    setName("");
    setDescription("");
    setTags("");
    setScopeCenturionId("");
    setFile(null);
    setError(null);
  }, []);

  const onCreate = React.useCallback(async () => {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      await createMediaAsset(
        companyId,
        {
          name: name.trim(),
          description: description.trim() ? description.trim() : undefined,
          tags: tags.trim() ? tags.trim() : undefined,
          centurion_id: scopeCenturionId || undefined,
        },
        file,
      );
      await assetsQuery.refetch();
      resetForm();
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar mídia");
    } finally {
      setSaving(false);
    }
  }, [assetsQuery, companyId, description, file, name, resetForm, scopeCenturionId, tags]);

  const onDelete = React.useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteMediaAsset(companyId, id);
        await assetsQuery.refetch();
      } finally {
        setDeletingId(null);
      }
    },
    [assetsQuery, companyId],
  );

  const onOpen = React.useCallback(
    async (asset: MediaAssetRow) => {
      try {
        const { url } = await getMediaAssetSignedUrl(companyId, asset.id);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao gerar link");
      }
    },
    [companyId],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mídias</CardTitle>
        <CardDescription>Biblioteca de assets por empresa (opcionalmente por Centurion).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">{assetsQuery.isLoading ? "Carregando..." : `${assets.length} asset(s)`}</div>
          <Button onClick={() => setModalOpen(true)}>Nova mídia</Button>
        </div>

        <Separator />

        {assetsQuery.isError ? (
          <p className="text-sm text-destructive">
            {assetsQuery.error instanceof Error ? assetsQuery.error.message : "Erro ao carregar mídias"}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.media_type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.centurion_id ? centurionMap.get(a.centurion_id)?.name ?? a.centurion_id : "empresa"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatBytes(a.file_size_bytes)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(a.tags ?? []).join(", ") || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => onOpen(a)}>
                        Abrir
                      </Button>
                      <Button size="sm" variant="destructive" disabled={deletingId === a.id} onClick={() => onDelete(a.id)}>
                        {deletingId === a.id ? "Removendo..." : "Remover"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!assets.length && !assetsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma mídia cadastrada.
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
              <DialogTitle>Nova mídia</DialogTitle>
              <DialogDescription>Suba um arquivo e defina tags/escopo para uso pelo Centurion.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cardápio PDF" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope">Escopo</Label>
                  <select
                    id="scope"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={scopeCenturionId}
                    onChange={(e) => setScopeCenturionId(e.target.value)}
                    disabled={centurionsQuery.isLoading || centurionsQuery.isError}
                  >
                    <option value="">Empresa (global)</option>
                    {centurions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.slug})
                      </option>
                    ))}
                  </select>
                  {centurionsQuery.isError ? (
                    <p className="text-xs text-destructive">
                      {centurionsQuery.error instanceof Error ? centurionsQuery.error.message : "Erro ao carregar centurions"}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (CSV ou JSON)</Label>
                <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ex: cardapio, buffet, prova_social" />
                <p className="text-xs text-muted-foreground">Ex: <span className="font-mono">cardapio,buffet</span> ou <span className="font-mono">["cardapio","buffet"]</span></p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Arquivo</Label>
                <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                {file ? <p className="text-xs text-muted-foreground">{file.name} • {formatBytes(file.size)}</p> : null}
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

