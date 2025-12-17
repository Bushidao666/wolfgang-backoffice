import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { CreatePixelDto } from "../dto/create-pixel.dto";
import type { UpdatePixelDto } from "../dto/update-pixel.dto";

type PixelRow = {
  id: string;
  company_id: string;
  pixel_id: string;
  meta_access_token: string;
  meta_test_event_code: string | null;
  domain: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function normalizePixelId(pixelId: string): string {
  const cleaned = pixelId.replace(/\s+/g, "");
  if (!/^\d{5,30}$/.test(cleaned)) throw new ValidationError("Invalid pixel_id", { pixel_id: pixelId });
  return cleaned;
}

function getEncryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY ?? "";
  if (!raw) {
    throw new ValidationError("APP_ENCRYPTION_KEY is required to store pixel tokens securely");
  }
  return createHash("sha256").update(raw).digest();
}

function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

function decryptSecret(encrypted: string): string {
  if (!encrypted.startsWith("v1:")) return encrypted;
  const [, ivB64, tagB64, dataB64] = encrypted.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new ValidationError("Invalid encrypted secret format");
  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf8");
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashEmail(email: string) {
  return sha256(email.trim().toLowerCase());
}

function hashPhone(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  return sha256(normalized);
}

@Injectable()
export class PixelsService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async list(companyId: string) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("pixel_configs")
      .select("id, company_id, pixel_id, meta_access_token, meta_test_event_code, domain, is_active, created_at, updated_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw new ValidationError("Failed to list pixel configs", { error });
    return (data ?? []).map((row: PixelRow) => this.toResponse(row));
  }

  async create(companyId: string, dto: CreatePixelDto) {
    const pixelId = normalizePixelId(dto.pixel_id);
    const tokenEncrypted = encryptSecret(dto.meta_access_token);

    const { data, error } = await this.admin()
      .schema("core")
      .from("pixel_configs")
      .insert({
        company_id: companyId,
        pixel_id: pixelId,
        meta_access_token: tokenEncrypted,
        meta_test_event_code: dto.meta_test_event_code ?? null,
        domain: dto.domain ?? null,
        is_active: dto.is_active ?? true,
      })
      .select("id, company_id, pixel_id, meta_access_token, meta_test_event_code, domain, is_active, created_at, updated_at")
      .single();
    if (error) throw new ValidationError("Failed to create pixel config", { error });
    return this.toResponse(data as PixelRow);
  }

  async update(companyId: string, id: string, dto: UpdatePixelDto) {
    const patch: Record<string, unknown> = {};
    if (dto.pixel_id) patch.pixel_id = normalizePixelId(dto.pixel_id);
    if (dto.domain !== undefined) patch.domain = dto.domain ?? null;
    if (dto.meta_test_event_code !== undefined) patch.meta_test_event_code = dto.meta_test_event_code ?? null;
    if (dto.is_active !== undefined) patch.is_active = dto.is_active;
    if (dto.meta_access_token) patch.meta_access_token = encryptSecret(dto.meta_access_token);

    const { data, error } = await this.admin()
      .schema("core")
      .from("pixel_configs")
      .update(patch)
      .eq("id", id)
      .eq("company_id", companyId)
      .select("id, company_id, pixel_id, meta_access_token, meta_test_event_code, domain, is_active, created_at, updated_at")
      .maybeSingle();
    if (error) throw new ValidationError("Failed to update pixel config", { error });
    if (!data) throw new NotFoundError("Pixel config not found");
    return this.toResponse(data as PixelRow);
  }

  async delete(companyId: string, id: string) {
    const { error } = await this.admin().schema("core").from("pixel_configs").delete().eq("id", id).eq("company_id", companyId);
    if (error) throw new ValidationError("Failed to delete pixel config", { error });
  }

  async listEvents(companyId: string, pixelConfigId: string, filters: { status?: string; from?: string; to?: string }) {
    const { data: pixel, error: pixelError } = await this.admin()
      .schema("core")
      .from("pixel_configs")
      .select("pixel_id")
      .eq("id", pixelConfigId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (pixelError) throw new ValidationError("Failed to load pixel config", { error: pixelError });
    if (!pixel?.pixel_id) throw new NotFoundError("Pixel config not found");

    let q = this.admin()
      .schema("core")
      .from("capi_event_logs")
      .select("*")
      .eq("company_id", companyId)
      .eq("pixel_id", pixel.pixel_id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (filters.status) q = q.eq("status", filters.status);
    if (filters.from) q = q.gte("created_at", filters.from);
    if (filters.to) q = q.lte("created_at", filters.to);

    const { data, error } = await q;
    if (error) throw new ValidationError("Failed to list CAPI logs", { error });
    return data ?? [];
  }

  async test(companyId: string, pixelConfigId: string) {
    const { data: pixel, error } = await this.admin()
      .schema("core")
      .from("pixel_configs")
      .select("*")
      .eq("id", pixelConfigId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (error) throw new ValidationError("Failed to load pixel config", { error });
    if (!pixel) throw new NotFoundError("Pixel config not found");

    const token = decryptSecret(String((pixel as any).meta_access_token ?? ""));
    const testCode = (pixel as any).meta_test_event_code;
    if (!testCode) throw new ValidationError("meta_test_event_code is required to send test events");

    const pixelId = normalizePixelId(String((pixel as any).pixel_id));
    const apiVersion = process.env.FACEBOOK_API_VERSION ?? "v20.0";
    const endpoint = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;

    const now = Math.floor(Date.now() / 1000);
    const body = {
      data: [
        {
          event_name: "Lead",
          event_time: now,
          action_source: "website",
          event_source_url: (pixel as any).domain ?? undefined,
          user_data: {
            em: [hashEmail("test@example.com")],
            ph: [hashPhone("+5511999999999")],
          },
          custom_data: { currency: "BRL", value: 0 },
        },
      ],
      test_event_code: testCode,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new ValidationError("Meta test event failed", { status: res.status, payload });
      return { ok: true, payload };
    } finally {
      clearTimeout(timeout);
    }
  }

  private toResponse(row: PixelRow) {
    return {
      id: row.id,
      company_id: row.company_id,
      pixel_id: row.pixel_id,
      meta_test_event_code: row.meta_test_event_code,
      domain: row.domain,
      is_active: !!row.is_active,
      has_access_token: !!row.meta_access_token,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

