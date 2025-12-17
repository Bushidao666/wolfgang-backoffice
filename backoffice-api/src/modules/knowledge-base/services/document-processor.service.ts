import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";

type KnowledgeDocumentRow = {
  id: string;
  company_id: string;
  title: string;
  file_path: string;
  file_type: string;
  status: string;
  metadata: Record<string, unknown> | null;
};

function chunkWords(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(words.length, start + chunkSize);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

function formatVector(vec: number[]): string {
  const safe = vec.map((v) => (Number.isFinite(v) ? v : 0));
  return `[${safe.join(",")}]`;
}

async function extractText(fileType: string, buffer: Buffer): Promise<string> {
  const normalized = fileType.toLowerCase();

  if (normalized === "txt") {
    return buffer.toString("utf-8");
  }

  if (normalized === "pdf") {
    const pdfParse = (await import("pdf-parse")).default as unknown as (data: Buffer) => Promise<{ text?: string }>;
    const out = await pdfParse(buffer);
    return out.text ?? "";
  }

  if (normalized === "docx") {
    const mammoth = (await import("mammoth")) as unknown as {
      extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>;
    };
    const out = await mammoth.extractRawText({ buffer });
    return out.value ?? "";
  }

  return "";
}

@Injectable()
export class DocumentProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentProcessorService.name);
  private timer?: NodeJS.Timeout;
  private processing = false;
  private readonly bucket = "knowledge_base";

  constructor(private readonly supabase: SupabaseService, private readonly configService: ConfigService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  onModuleInit() {
    const disabled = (this.configService.get<string>("DISABLE_WORKERS") ?? process.env.DISABLE_WORKERS) === "true";
    if (disabled || process.env.NODE_ENV === "test") return;

    const intervalMs = Number(process.env.KB_PROCESSOR_INTERVAL_MS ?? 10_000);
    this.timer = setInterval(() => void this.processPending().catch(() => undefined), Math.max(5_000, intervalMs));
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async processDocument(documentId: string) {
    await this._processOne(documentId);
  }

  async processPending() {
    if (this.processing) return;
    this.processing = true;
    try {
      const { data, error } = await this.admin()
        .schema("core")
        .from("knowledge_documents")
        .select("*")
        .in("status", ["uploaded"])
        .order("created_at", { ascending: true })
        .limit(3);
      if (error) return;
      for (const doc of data ?? []) {
        await this._processOne(doc.id).catch(() => undefined);
      }
    } finally {
      this.processing = false;
    }
  }

  private async _processOne(documentId: string) {
    const claimed = await this._claim(documentId);
    if (!claimed) return;

    try {
      const file = await this._download(claimed.file_path);
      const raw = await extractText(claimed.file_type, file);
      const text = raw.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
      const chunks = chunkWords(text, Number(process.env.KB_CHUNK_WORDS ?? 500), Number(process.env.KB_CHUNK_OVERLAP ?? 50));

      if (!chunks.length) {
        await this._markError(documentId, "No text content extracted", claimed.metadata ?? undefined);
        return;
      }

      const embeddings = await this._embedChunks(chunks);
      if (embeddings.length !== chunks.length) {
        await this._markError(documentId, "Embedding generation failed", claimed.metadata ?? undefined);
        return;
      }

      await this.admin().schema("core").from("knowledge_chunks").delete().eq("document_id", documentId).eq("company_id", claimed.company_id);

      const rows = chunks.map((content, idx) => ({
        company_id: claimed.company_id,
        document_id: documentId,
        chunk_index: idx,
        content,
        embedding: formatVector(embeddings[idx] ?? []),
        metadata: { title: claimed.title },
      }));

      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200);
        const { error: insertError } = await this.admin().schema("core").from("knowledge_chunks").insert(batch);
        if (insertError) throw insertError;
      }

      const { error: updateError } = await this.admin()
        .schema("core")
        .from("knowledge_documents")
        .update({ status: "ready", metadata: { ...(claimed.metadata ?? {}), chunks: chunks.length } })
        .eq("id", documentId);
      if (updateError) throw updateError;
    } catch (err) {
      this.logger.error("kb.process_failed", err as Error);
      await this._markError(documentId, err instanceof Error ? err.message : String(err), claimed.metadata ?? undefined);
    }
  }

  private async _claim(documentId: string): Promise<KnowledgeDocumentRow | null> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("knowledge_documents")
      .update({ status: "processing" })
      .eq("id", documentId)
      .eq("status", "uploaded")
      .select("*")
      .maybeSingle();

    if (error || !data) return null;
    return data as KnowledgeDocumentRow;
  }

  private async _download(filePath: string): Promise<Buffer> {
    const { data, error } = await this.admin().storage.from(this.bucket).download(filePath);
    if (error || !data) throw new ValidationError("Failed to download document", { error });

    // data can be Blob in Node runtime (undici); convert to Buffer safely.
    const arrayBuffer = await (data as unknown as Blob).arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async _embedChunks(chunks: string[]): Promise<number[][]> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new ValidationError("OPENAI_API_KEY is required to process Knowledge Base embeddings");
    }

    const base = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

    const results: number[][] = [];
    const batchSize = Number(process.env.KB_EMBED_BATCH ?? 32);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const input = chunks.slice(i, i + batchSize);

      const res = await fetch(`${base}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, input }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ValidationError("OpenAI embeddings request failed", { status: res.status, body: text });
      }

      const json = (await res.json()) as { data?: { embedding: number[] }[] };
      const embedded = (json.data ?? []).map((d) => d.embedding).filter((e): e is number[] => Array.isArray(e));
      results.push(...embedded);
    }

    return results;
  }

  private async _markError(documentId: string, message: string, metadata?: Record<string, unknown>) {
    await this.admin()
      .schema("core")
      .from("knowledge_documents")
      .update({ status: "error", metadata: { ...(metadata ?? {}), error: message } })
      .eq("id", documentId);
  }
}
