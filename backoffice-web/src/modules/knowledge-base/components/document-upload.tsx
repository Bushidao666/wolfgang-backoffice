"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadDocument } from "@/modules/knowledge-base/services/kb.service";

export function DocumentUpload({ companyId, onUploaded }: { companyId: string; onUploaded: () => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onPick = React.useCallback((next: File | null) => {
    setError(null);
    setFile(next);
    if (next && !title.trim()) setTitle(next.name);
  }, [title]);

  const onSubmit = React.useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadDocument(companyId, file, title);
      onPick(null);
      setTitle("");
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }, [companyId, file, onPick, onUploaded, title]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload</CardTitle>
        <CardDescription>Envie PDF, DOCX ou TXT para enriquecer as respostas do Centurion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="kb_title">Título</Label>
          <Input id="kb_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Tabela de preços 2025" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kb_file">Arquivo</Label>
          <Input
            id="kb_file"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">Arquivos grandes podem demorar para processar (status: processing).</p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={!file || uploading}>
            {uploading ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

