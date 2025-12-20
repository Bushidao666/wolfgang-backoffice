import { Injectable } from "@nestjs/common";

import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { CreateCenturionDto, UpdateCenturionDto } from "../dto/create-centurion.dto";
import type { CenturionResponseDto } from "../dto/centurion-response.dto";

@Injectable()
export class CenturionsService {
  constructor(private readonly supabase: SupabaseService) {}

  private toJsonObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    try {
      return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private admin() {
    return this.supabase.getAdminClient();
  }

  async list(companyId: string): Promise<CenturionResponseDto[]> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("centurion_configs")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw new ValidationError("Failed to list centurions", { error });
    return (data ?? []) as unknown as CenturionResponseDto[];
  }

  async get(companyId: string, centurionId: string): Promise<CenturionResponseDto> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("centurion_configs")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", centurionId)
      .maybeSingle();
    if (error) throw new ValidationError("Failed to load centurion", { error });
    if (!data) throw new NotFoundError("Centurion not found");
    return data as unknown as CenturionResponseDto;
  }

  async create(companyId: string, dto: CreateCenturionDto): Promise<CenturionResponseDto> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("centurion_configs")
      .insert({
        company_id: companyId,
        name: dto.name,
        slug: dto.slug,
        prompt: dto.prompt,
        personality: this.toJsonObject(dto.personality ?? {}),
        qualification_rules: this.toJsonObject(dto.qualification_rules ?? {}),
        can_send_audio: dto.can_send_audio ?? true,
        can_send_image: dto.can_send_image ?? true,
        can_send_video: dto.can_send_video ?? true,
        can_process_audio: dto.can_process_audio ?? true,
        can_process_image: dto.can_process_image ?? true,
        message_chunking_enabled: dto.message_chunking_enabled ?? true,
        chunk_delay_ms: dto.chunk_delay_ms ?? 1500,
        debounce_wait_ms: dto.debounce_wait_ms ?? 3000,
        is_active: dto.is_active ?? true,
        max_retries: dto.max_retries ?? 3,
      })
      .select("*")
      .single();
    if (error) throw new ValidationError("Failed to create centurion", { error });
    return data as unknown as CenturionResponseDto;
  }

  async update(companyId: string, centurionId: string, dto: UpdateCenturionDto): Promise<CenturionResponseDto> {
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.slug !== undefined) patch.slug = dto.slug;
    if (dto.prompt !== undefined) patch.prompt = dto.prompt;
    if (dto.personality !== undefined) patch.personality = this.toJsonObject(dto.personality ?? {});
    if (dto.qualification_rules !== undefined) patch.qualification_rules = this.toJsonObject(dto.qualification_rules ?? {});

    for (const key of [
      "can_send_audio",
      "can_send_image",
      "can_send_video",
      "can_process_audio",
      "can_process_image",
      "message_chunking_enabled",
      "chunk_delay_ms",
      "debounce_wait_ms",
      "is_active",
      "max_retries",
    ] as const) {
      const value = (dto as any)[key];
      if (value !== undefined) patch[key] = value;
    }

    const { data, error } = await this.admin()
      .schema("core")
      .from("centurion_configs")
      .update(patch)
      .eq("company_id", companyId)
      .eq("id", centurionId)
      .select("*")
      .maybeSingle();
    if (error) throw new ValidationError("Failed to update centurion", { error });
    if (!data) throw new NotFoundError("Centurion not found");
    return data as unknown as CenturionResponseDto;
  }

  async delete(companyId: string, centurionId: string): Promise<void> {
    const { error } = await this.admin()
      .schema("core")
      .from("centurion_configs")
      .delete()
      .eq("company_id", companyId)
      .eq("id", centurionId);
    if (error) throw new ValidationError("Failed to delete centurion", { error });
  }
}
