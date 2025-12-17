import { Injectable } from "@nestjs/common";

import { ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { LeadTimelineResponseDto } from "../dto/timeline-response.dto";

@Injectable()
export class TimelineService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async getTimeline(companyId: string, leadId: string, args: { limit?: number; offset?: number }): Promise<LeadTimelineResponseDto> {
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 500);
    const offset = Math.max(args.offset ?? 0, 0);

    const { data, error, count } = await this.admin()
      .schema("core")
      .from("messages")
      .select("id, conversation_id, direction, content_type, content, audio_transcription, image_description, channel_message_id, metadata, created_at", {
        count: "exact",
      })
      .eq("company_id", companyId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw new ValidationError("Failed to load lead timeline", { error });

    return {
      lead_id: leadId,
      company_id: companyId,
      total: count ?? (data ?? []).length,
      limit,
      offset,
      messages: (data ?? []) as any,
    };
  }
}

