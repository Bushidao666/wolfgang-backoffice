import { apiFetch } from "@/lib/api/client";

export type KnowledgeDocument = {
  id: string;
  company_id: string;
  title: string;
  file_path: string;
  file_type: string;
  status: "uploaded" | "processing" | "ready" | "error";
  uploaded_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type KnowledgeChunk = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  created_at: string;
};

export async function listDocuments(companyId: string) {
  return apiFetch<KnowledgeDocument[]>("/knowledge-base/documents", {
    headers: { "x-company-id": companyId },
  });
}

export async function uploadDocument(companyId: string, file: File, title?: string) {
  const form = new FormData();
  form.append("file", file);
  if (title?.trim()) form.append("title", title.trim());

  return apiFetch<KnowledgeDocument>("/knowledge-base/documents", {
    method: "POST",
    headers: { "x-company-id": companyId },
    body: form,
  });
}

export async function deleteDocument(companyId: string, documentId: string) {
  return apiFetch<void>(`/knowledge-base/documents/${encodeURIComponent(documentId)}`, {
    method: "DELETE",
    headers: { "x-company-id": companyId },
  });
}

export async function listChunks(companyId: string, documentId: string, limit = 120) {
  return apiFetch<KnowledgeChunk[]>(
    `/knowledge-base/documents/${encodeURIComponent(documentId)}/chunks?limit=${encodeURIComponent(limit)}`,
    { headers: { "x-company-id": companyId } },
  );
}

