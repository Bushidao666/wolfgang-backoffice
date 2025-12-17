"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteDocument, listChunks, type KnowledgeDocument, type KnowledgeChunk } from "@/modules/knowledge-base/services/kb.service";

function StatusBadge({ status }: { status: KnowledgeDocument["status"] }) {
  const map: Record<KnowledgeDocument["status"], { label: string; cls: string }> = {
    uploaded: { label: "uploaded", cls: "bg-muted text-foreground" },
    processing: { label: "processing", cls: "bg-yellow-500/20 text-yellow-700" },
    ready: { label: "ready", cls: "bg-emerald-500/20 text-emerald-700" },
    error: { label: "error", cls: "bg-red-500/20 text-red-700" },
  };
  const item = map[status];
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs ${item.cls}`}>{item.label}</span>;
}

export function DocumentList({
  companyId,
  documents,
  onChanged,
}: {
  companyId: string;
  documents: KnowledgeDocument[];
  onChanged: () => void;
}) {
  const [previewDoc, setPreviewDoc] = React.useState<KnowledgeDocument | null>(null);
  const [chunks, setChunks] = React.useState<KnowledgeChunk[] | null>(null);
  const [loadingChunks, setLoadingChunks] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const openPreview = React.useCallback(
    async (doc: KnowledgeDocument) => {
      setPreviewDoc(doc);
      setChunks(null);
      setError(null);
      setLoadingChunks(true);
      try {
        const data = await listChunks(companyId, doc.id, 120);
        setChunks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar chunks");
      } finally {
        setLoadingChunks(false);
      }
    },
    [companyId],
  );

  const onDelete = React.useCallback(
    async (docId: string) => {
      setDeletingId(docId);
      setError(null);
      try {
        await deleteDocument(companyId, docId);
        onChanged();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao remover documento");
      } finally {
        setDeletingId(null);
      }
    },
    [companyId, onChanged],
  );

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.title}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.file_type}</TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(d.updated_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openPreview(d)} disabled={d.status !== "ready"}>
                      Chunks
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deletingId === d.id}
                      onClick={() => onDelete(d.id)}
                    >
                      {deletingId === d.id ? "Removendo..." : "Remover"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!documents.length ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum documento enviado.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!previewDoc}
        onOpenChange={(open) => {
          if (!open) setPreviewDoc(null);
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Chunks: {previewDoc?.title}</DialogTitle>
            <DialogDescription>Prévia dos primeiros chunks processados (até 120).</DialogDescription>
          </DialogHeader>
          {loadingChunks ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
          {chunks ? (
            <div className="max-h-[60vh] overflow-auto space-y-3">
              {chunks.map((c) => (
                <div key={c.id} className="rounded-md border p-3">
                  <div className="mb-2 text-xs text-muted-foreground">#{c.chunk_index}</div>
                  <pre className="whitespace-pre-wrap text-sm">{c.content}</pre>
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

