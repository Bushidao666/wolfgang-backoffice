import { Injectable } from "@nestjs/common";

import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { LeadFiltersDto } from "../dto/lead-filters.dto";
import type { LeadQualificationEventsResponseDto } from "../dto/qualification-events.dto";
import type { LeadListResponseDto, LeadResponseDto } from "../dto/lead-response.dto";

@Injectable()
export class LeadsService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async list(companyId: string, filters: LeadFiltersDto): Promise<LeadListResponseDto> {
    const page = filters.page ?? 1;
    const perPage = filters.per_page ?? 50;
    const offset = (page - 1) * perPage;

    let query = this.admin()
      .schema("core")
      .from("leads")
      .select("*", { count: "exact" })
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (filters.status) {
      query = query.eq("lifecycle_stage", filters.status);
    }

    if (filters.from) {
      query = query.gte("created_at", filters.from);
    }

    if (filters.to) {
      query = query.lte("created_at", filters.to);
    }

    if (filters.channel) {
      if (filters.channel === "telegram") {
        query = query.like("phone", "telegram:%");
      } else if (filters.channel === "instagram") {
        query = query.like("phone", "instagram:%");
      } else if (filters.channel === "whatsapp") {
        query = query.not("phone", "like", "telegram:%").not("phone", "like", "instagram:%");
      }
    }

    if (filters.q) {
      const term = `%${filters.q}%`;
      query = query.or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
    }

    const { data, error, count } = await query.range(offset, offset + perPage - 1);
    if (error) throw new ValidationError("Failed to list leads", { error });

    return {
      page,
      per_page: perPage,
      total: count ?? 0,
      data: (data ?? []) as unknown as LeadResponseDto[],
    };
  }

  async get(companyId: string, leadId: string): Promise<LeadResponseDto> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("leads")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", leadId)
      .maybeSingle();
    if (error) throw new ValidationError("Failed to load lead", { error });
    if (!data) throw new NotFoundError("Lead not found");
    return data as unknown as LeadResponseDto;
  }

  async listQualificationEvents(
    companyId: string,
    leadId: string,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<LeadQualificationEventsResponseDto> {
    const limit = Math.min(200, Math.max(1, Number(opts.limit ?? 50)));
    const offset = Math.max(0, Number(opts.offset ?? 0));

    const { data, error, count } = await this.admin()
      .schema("core")
      .from("lead_qualification_events")
      .select("*", { count: "exact" })
      .eq("company_id", companyId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new ValidationError("Failed to list qualification events", { error });

    return {
      lead_id: leadId,
      company_id: companyId,
      total: count ?? 0,
      limit,
      offset,
      events: (data ?? []) as any,
    };
  }
}
