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
import { createPixel, deletePixel, listPixels, testPixel } from "@/modules/marketing/services/pixels.service";

export function PixelsConfig({ companyId }: { companyId: string }) {
  const pixelsQuery = useQuery({
    queryKey: ["pixels", companyId],
    queryFn: () => listPixels(companyId),
    enabled: !!companyId,
  });

  const pixels = pixelsQuery.data ?? [];
  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [pixelId, setPixelId] = React.useState("");
  const [token, setToken] = React.useState("");
  const [testCode, setTestCode] = React.useState("");
  const [domain, setDomain] = React.useState("");

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [lastTestResult, setLastTestResult] = React.useState<string | null>(null);

  const resetForm = React.useCallback(() => {
    setPixelId("");
    setToken("");
    setTestCode("");
    setDomain("");
    setError(null);
    setLastTestResult(null);
  }, []);

  const onCreate = React.useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await createPixel(companyId, {
        pixel_id: pixelId.trim(),
        meta_access_token: token.trim(),
        meta_test_event_code: testCode.trim() ? testCode.trim() : undefined,
        domain: domain.trim() ? domain.trim() : undefined,
        is_active: true,
      });
      await pixelsQuery.refetch();
      resetForm();
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar pixel");
    } finally {
      setSaving(false);
    }
  }, [companyId, domain, pixelId, pixelsQuery, resetForm, testCode, token]);

  const onDelete = React.useCallback(
    async (id: string) => {
      setDeletingId(id);
      setError(null);
      try {
        await deletePixel(companyId, id);
        await pixelsQuery.refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao remover pixel");
      } finally {
        setDeletingId(null);
      }
    },
    [companyId, pixelsQuery],
  );

  const onTest = React.useCallback(
    async (id: string) => {
      setTestingId(id);
      setError(null);
      setLastTestResult(null);
      try {
        const result = await testPixel(companyId, id);
        setLastTestResult(JSON.stringify(result.payload, null, 2));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha no teste");
      } finally {
        setTestingId(null);
      }
    },
    [companyId],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pixels</CardTitle>
        <CardDescription>Configurações por empresa (token é armazenado criptografado).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">{pixelsQuery.isLoading ? "Carregando..." : `${pixels.length} pixel(s)`}</div>
          <Button onClick={() => setModalOpen(true)}>Novo pixel</Button>
        </div>

        <Separator />

        {pixelsQuery.isError ? (
          <p className="text-sm text-destructive">
            {pixelsQuery.error instanceof Error ? pixelsQuery.error.message : "Erro ao carregar pixels"}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pixel ID</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Test Code</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pixels.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.pixel_id}</TableCell>
                  <TableCell>{p.is_active ? "sim" : "não"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.has_access_token ? "configurado" : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.meta_test_event_code ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" disabled={testingId === p.id} onClick={() => onTest(p.id)}>
                        {testingId === p.id ? "Testando..." : "Testar"}
                      </Button>
                      <Button size="sm" variant="destructive" disabled={deletingId === p.id} onClick={() => onDelete(p.id)}>
                        {deletingId === p.id ? "Removendo..." : "Remover"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!pixels.length && !pixelsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum pixel configurado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        {lastTestResult ? (
          <details className="rounded-md border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">Resultado do teste</summary>
            <pre className="mt-2 max-h-56 overflow-auto text-xs">{lastTestResult}</pre>
          </details>
        ) : null}

        <Dialog
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Novo pixel</DialogTitle>
              <DialogDescription>Pixel ID + access token + (opcional) test event code.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pixelId">Pixel ID</Label>
                  <Input id="pixelId" value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="1234567890" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain / Source URL (opcional)</Label>
                  <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="https://exemplo.com" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="token">Access token</Label>
                  <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAB..." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="testCode">Test event code (opcional)</Label>
                  <Input id="testCode" value={testCode} onChange={(e) => setTestCode(e.target.value)} placeholder="TEST123" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={onCreate} disabled={saving || !pixelId.trim() || !token.trim()}>
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

