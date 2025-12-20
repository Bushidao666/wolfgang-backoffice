import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";

import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { CreateMediaAssetDto, UpdateMediaAssetDto } from "../dto/media-asset.dto";

type UploadedFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size?: number;
};

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "media";
}

function parseTags(raw?: string): string[] {
  if (!raw?.trim()) return [];
  const trimmed = raw.trim();

  let tags: string[] = [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) tags = parsed.map((t) => String(t));
    } catch {
      tags = [];
    }
  } else {
    tags = trimmed.split(",").map((t) => t.trim());
  }

  const uniq = new Set<string>();
  for (const t of tags) {
    const v = t.trim();
    if (!v) continue;
    if (v.length > 40) continue;
    uniq.add(v);
  }
  return Array.from(uniq).slice(0, 32);
}

function inferMediaType(file: UploadedFile, explicit?: string): "audio" | "image" | "video" | "document" {
  if (explicit === "audio" || explicit === "image" || explicit === "video" || explicit === "document") return explicit;

  const mt = file.mimetype || "";
  if (mt.startsWith("image/")) return "image";
  if (mt.startsWith("video/")) return "video";
  if (mt.startsWith("audio/")) return "audio";
  return "document";
}

@Injectable()
export class MediaAssetsService {
  private readonly bucket = "media_assets";

  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async list(companyId: string, opts: { centurionId?: string | null } = {}) {
    let q = this.admin()
      .schema("core")
      .from("media_assets")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (opts.centurionId === null) {
      q = q.is("centurion_id", null);
    } else if (opts.centurionId) {
      q = q.eq("centurion_id", opts.centurionId);
    }

    const { data, error } = await q;
    if (error) throw new ValidationError("Failed to list media assets", { error });
    return data ?? [];
  }

  async create(companyId: string, dto: CreateMediaAssetDto, file: UploadedFile | undefined) {
    if (!file?.buffer?.length) throw new ValidationError("Missing media file");

    const assetId = randomUUID();
    const filename = safeFileName(file.originalname);
    const filePath = `${companyId}/${assetId}/${filename}`;

    const mimeType = file.mimetype || "application/octet-stream";
    const mediaType = inferMediaType(file, dto.media_type);
    const tags = parseTags(dto.tags);

    const { error: uploadError } = await this.admin().storage.from(this.bucket).upload(filePath, file.buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (uploadError) throw new ValidationError("Failed to upload media file", { error: uploadError });

    const { data, error } = await this.admin()
      .schema("core")
      .from("media_assets")
      .insert({
        id: assetId,
        company_id: companyId,
        centurion_id: dto.centurion_id ?? null,
        name: dto.name,
        description: dto.description ?? null,
        media_type: mediaType,
        mime_type: mimeType,
        bucket: this.bucket,
        file_path: filePath,
        file_size_bytes: file.size ?? file.buffer.length,
        tags,
        is_active: dto.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) {
      await this.admin().storage.from(this.bucket).remove([filePath]).catch(() => undefined);
      throw new ValidationError("Failed to create media asset", { error });
    }

    return data;
  }

  async update(companyId: string, assetId: string, dto: UpdateMediaAssetDto, file?: UploadedFile) {
    const tags = dto.tags !== undefined ? parseTags(dto.tags) : undefined;

    let filePath: string | undefined;
    let mimeType: string | undefined;
    let mediaType: string | undefined;
    let sizeBytes: number | undefined;

    if (file?.buffer?.length) {
      const filename = safeFileName(file.originalname);
      filePath = `${companyId}/${assetId}/${filename}`;
      mimeType = file.mimetype || "application/octet-stream";
      mediaType = inferMediaType(file, dto.media_type);
      sizeBytes = file.size ?? file.buffer.length;

      const { error: uploadError } = await this.admin().storage.from(this.bucket).upload(filePath, file.buffer, {
        contentType: mimeType,
        upsert: true,
      });
      if (uploadError) throw new ValidationError("Failed to upload media file", { error: uploadError });
    }

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.description !== undefined) patch.description = dto.description ?? null;
    if (dto.centurion_id !== undefined) patch.centurion_id = dto.centurion_id ?? null;
    if (dto.is_active !== undefined) patch.is_active = dto.is_active;
    if (dto.media_type !== undefined) patch.media_type = dto.media_type;
    if (tags !== undefined) patch.tags = tags;
    if (filePath !== undefined) patch.file_path = filePath;
    if (mimeType !== undefined) patch.mime_type = mimeType;
    if (mediaType !== undefined) patch.media_type = mediaType;
    if (sizeBytes !== undefined) patch.file_size_bytes = sizeBytes;

    const { data, error } = await this.admin()
      .schema("core")
      .from("media_assets")
      .update(patch)
      .eq("id", assetId)
      .eq("company_id", companyId)
      .select("*")
      .maybeSingle();
    if (error) throw new ValidationError("Failed to update media asset", { error });
    if (!data) throw new NotFoundError("Media asset not found");
    return data;
  }

  async delete(companyId: string, assetId: string) {
    const { data, error: fetchError } = await this.admin()
      .schema("core")
      .from("media_assets")
      .select("bucket,file_path")
      .eq("id", assetId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (fetchError) throw new ValidationError("Failed to load media asset", { error: fetchError });
    if (!data) throw new NotFoundError("Media asset not found");

    const bucket = (data as any).bucket || this.bucket;
    const filePath = (data as any).file_path as string | undefined;
    if (filePath) {
      await this.admin().storage.from(bucket).remove([filePath]).catch(() => undefined);
    }

    const { error } = await this.admin()
      .schema("core")
      .from("media_assets")
      .delete()
      .eq("id", assetId)
      .eq("company_id", companyId);
    if (error) throw new ValidationError("Failed to delete media asset", { error });
  }

  async createSignedUrl(companyId: string, assetId: string, expiresInSeconds = 600) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("media_assets")
      .select("bucket,file_path")
      .eq("id", assetId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (error) throw new ValidationError("Failed to load media asset", { error });
    if (!data) throw new NotFoundError("Media asset not found");

    const bucket = (data as any).bucket || this.bucket;
    const filePath = (data as any).file_path as string | undefined;
    if (!filePath) throw new ValidationError("Media asset missing file_path");

    const { data: signed, error: signedError } = await this.admin().storage.from(bucket).createSignedUrl(filePath, expiresInSeconds);
    if (signedError || !signed?.signedUrl) {
      throw new ValidationError("Failed to create signed URL", { error: signedError });
    }
    return { url: signed.signedUrl };
  }
}

