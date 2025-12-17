import { Injectable } from "@nestjs/common";

import { ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { CreateFollowupRuleDto } from "../dto/create-followup-rule.dto";

@Injectable()
export class FollowupsService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async list(companyId: string, centurionId: string) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("followup_rules")
      .select("*")
      .eq("company_id", companyId)
      .eq("centurion_id", centurionId)
      .order("created_at", { ascending: false });
    if (error) throw new ValidationError("Failed to list follow-up rules", { error });
    return data ?? [];
  }

  async create(companyId: string, centurionId: string, dto: CreateFollowupRuleDto) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("followup_rules")
      .insert({
        company_id: companyId,
        centurion_id: centurionId,
        name: dto.name,
        inactivity_hours: dto.inactivity_hours ?? 24,
        template: dto.template,
        max_attempts: dto.max_attempts ?? 1,
        is_active: dto.is_active ?? true,
      })
      .select("*")
      .single();
    if (error) throw new ValidationError("Failed to create follow-up rule", { error });
    return data;
  }

  async update(companyId: string, centurionId: string, ruleId: string, dto: CreateFollowupRuleDto) {
    const { data, error } = await this.admin()
      .schema("core")
      .from("followup_rules")
      .update({
        name: dto.name,
        inactivity_hours: dto.inactivity_hours ?? 24,
        template: dto.template,
        max_attempts: dto.max_attempts ?? 1,
        is_active: dto.is_active ?? true,
      })
      .eq("id", ruleId)
      .eq("company_id", companyId)
      .eq("centurion_id", centurionId)
      .select("*")
      .maybeSingle();
    if (error) throw new ValidationError("Failed to update follow-up rule", { error });
    if (!data) throw new ValidationError("Follow-up rule not found");
    return data;
  }

  async delete(companyId: string, centurionId: string, ruleId: string): Promise<void> {
    const { error } = await this.admin()
      .schema("core")
      .from("followup_rules")
      .delete()
      .eq("id", ruleId)
      .eq("company_id", companyId)
      .eq("centurion_id", centurionId);
    if (error) throw new ValidationError("Failed to delete follow-up rule", { error });
  }
}

