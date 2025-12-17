"use client";

import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useKbDocuments } from "@/modules/knowledge-base/hooks/use-kb-documents";
import { DocumentList } from "@/modules/knowledge-base/components/document-list";
import { DocumentUpload } from "@/modules/knowledge-base/components/document-upload";

export function KbManager({ companyId }: { companyId: string }) {
  const docsQuery = useKbDocuments(companyId);
  const documents = docsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <DocumentUpload companyId={companyId} onUploaded={() => void docsQuery.refetch()} />

      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>Status em tempo real (auto-refresh enquanto houver processing).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {docsQuery.isLoading ? "Carregando..." : `${documents.length} documento(s)`}
          </div>
          <Separator />
          {docsQuery.isError ? (
            <p className="text-sm text-destructive">
              {docsQuery.error instanceof Error ? docsQuery.error.message : "Erro ao carregar documentos"}
            </p>
          ) : null}
          <DocumentList companyId={companyId} documents={documents} onChanged={() => void docsQuery.refetch()} />
        </CardContent>
      </Card>
    </div>
  );
}

