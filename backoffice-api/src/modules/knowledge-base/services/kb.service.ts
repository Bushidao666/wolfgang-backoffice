import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

import { ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import { DocumentProcessorService } from "./document-processor.service";

type UploadedFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "document";
}

function inferFileType(file: UploadedFile): "pdf" | "docx" | "txt" {
  const lower = file.originalname.toLowerCase();
  if (file.mimetype === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  )
    return "docx";
  if (file.mimetype.startsWith("text/") || lower.endsWith(".txt")) return "txt";
  throw new ValidationError("Unsupported file type. Use PDF, DOCX or TXT.", { mimetype: file.mimetype });
}

@Injectable()
export class KbService {
  private readonly bucket = "knowledge_base";

  constructor(
    private readonly supabase: SupabaseService,
    private readonly processor: DocumentProcessorService,
    private readonly configService: ConfigService,
  ) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async listDocuments(companyId: string) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("knowledge_documents")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw new ValidationError("Failed to list documents", { error });
    return data ?? [];
  }

  async uploadDocument(companyId: string, userId: string | undefined, file: UploadedFile, title?: string) {
    if (!file?.buffer?.length) {
      throw new ValidationError("Missing file");
    }

    const fileType = inferFileType(file);
    const documentId = randomUUID();
    const filename = safeFileName(file.originalname);
    const filePath = `${companyId}/${documentId}/${filename}`;

    const { error: uploadError } = await this.admin().storage.from(this.bucket).upload(filePath, file.buffer, {
      contentType: file.mimetype || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) throw new ValidationError("Failed to upload document", { error: uploadError });

    const metadata = {
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
    };

    const { data, error } = await this.admin()
      .schema("core")
      .from("knowledge_documents")
      .insert({
        id: documentId,
        company_id: companyId,
        title: (title?.trim() || file.originalname).slice(0, 200),
        file_path: filePath,
        file_type: fileType,
        status: "uploaded",
        uploaded_by: userId ?? null,
        metadata,
      })
      .select("*")
      .single();

    if (error) {
      await this.admin().storage.from(this.bucket).remove([filePath]).catch(() => undefined);
      throw new ValidationError("Failed to create document record", { error });
    }

    const workersDisabled = (this.configService.get<string>("DISABLE_WORKERS") ?? process.env.DISABLE_WORKERS) === "true";
    if (!workersDisabled && process.env.NODE_ENV !== "test") {
      void this.processor.processDocument(documentId);
    }

    return data;
  }

  async deleteDocument(companyId: string, documentId: string) {
    const { data: doc, error: fetchError } = await this.admin()
      .schema("core")
      .from("knowledge_documents")
      .select("*")
      .eq("id", documentId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (fetchError) throw new ValidationError("Failed to load document", { error: fetchError });
    if (!doc) throw new ValidationError("Document not found");

    await this.admin()
      .schema("core")
      .from("knowledge_chunks")
      .delete()
      .eq("document_id", documentId)
      .eq("company_id", companyId);

    await this.admin().storage.from(this.bucket).remove([doc.file_path]).catch(() => undefined);

    const { error } = await this.admin()
      .schema("core")
      .from("knowledge_documents")
      .delete()
      .eq("id", documentId)
      .eq("company_id", companyId);
    if (error) throw new ValidationError("Failed to delete document", { error });
  }

  async listChunks(companyId: string, documentId: string, limit = 100, offset = 0) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("knowledge_chunks")
      .select("id, document_id, chunk_index, content, created_at")
      .eq("company_id", companyId)
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true })
      .range(offset, offset + Math.max(0, limit - 1));

    if (error) throw new ValidationError("Failed to list chunks", { error });
    return data ?? [];
  }
}

