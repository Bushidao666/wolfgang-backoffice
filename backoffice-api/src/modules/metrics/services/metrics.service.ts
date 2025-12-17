import { Injectable } from "@nestjs/common";

import { ValidationError } from "@wolfgang/contracts";

import { CacheService } from "../../../infrastructure/redis/cache.service";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { MetricsByCenturionDto, MetricsConversionDto, MetricsSummaryDto, MetricsTimelineDto } from "../dto/metrics-response.dto";

type LeadRow = {
  id: string;
  lifecycle_stage: string;
  is_qualified: boolean;
  created_at: string;
  qualified_at: string | null;
  centurion_id: string | null;
};

type ContractRow = { id: string; signed_at: string | null };
type CenturionRow = { id: string; name: string };

function parseRange(from?: string, to?: string) {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const start = from ? new Date(from) : defaultFrom;
  const end = to ? new Date(to) : now;

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw new ValidationError("Invalid date range", { from, to });
  }
  if (start > end) {
    throw new ValidationError("Invalid date range (from > to)", { from, to });
  }

  return { from: start, to: end };
}

function asDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class MetricsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  private async cacheKey(companyId: string, kind: string, range: { from: Date; to: Date }) {
    const bust = await this.cache.getCompanyBust(companyId);
    return `metrics:${companyId}:${kind}:${bust}:${range.from.toISOString()}:${range.to.toISOString()}`;
  }

  async summary(companyId: string, range: { from?: string; to?: string }): Promise<MetricsSummaryDto> {
    const parsed = parseRange(range.from, range.to);
    const key = await this.cacheKey(companyId, "summary", parsed);
    const cached = await this.cache.getJson<MetricsSummaryDto>(key);
    if (cached) return cached;

    const leads = await this.loadLeads(companyId, parsed.from, parsed.to);

    const byStage: Record<string, number> = {};
    let qualified = 0;
    let totalQualificationSeconds = 0;
    let qualifiedWithTime = 0;

    for (const lead of leads) {
      const stage = lead.lifecycle_stage || "unknown";
      byStage[stage] = (byStage[stage] ?? 0) + 1;
      if (lead.is_qualified) qualified += 1;

      if (lead.qualified_at) {
        const createdAt = new Date(lead.created_at).getTime();
        const qualifiedAt = new Date(lead.qualified_at).getTime();
        if (Number.isFinite(createdAt) && Number.isFinite(qualifiedAt) && qualifiedAt >= createdAt) {
          totalQualificationSeconds += Math.floor((qualifiedAt - createdAt) / 1000);
          qualifiedWithTime += 1;
        }
      }
    }

    const total = leads.length;
    const result: MetricsSummaryDto = {
      company_id: companyId,
      from: parsed.from.toISOString(),
      to: parsed.to.toISOString(),
      total_leads: total,
      by_stage: byStage,
      qualified_leads: qualified,
      conversion_rate: total ? qualified / total : 0,
      avg_qualification_seconds: qualifiedWithTime ? Math.floor(totalQualificationSeconds / qualifiedWithTime) : 0,
    };

    await this.cache.setJson(key, result);
    return result;
  }

  async conversion(companyId: string, range: { from?: string; to?: string }): Promise<MetricsConversionDto> {
    const parsed = parseRange(range.from, range.to);
    const key = await this.cacheKey(companyId, "conversion", parsed);
    const cached = await this.cache.getJson<MetricsConversionDto>(key);
    if (cached) return cached;

    const leads = await this.loadLeads(companyId, parsed.from, parsed.to);
    const funnel: Record<string, number> = {};
    for (const lead of leads) {
      const stage = lead.lifecycle_stage || "unknown";
      funnel[stage] = (funnel[stage] ?? 0) + 1;
    }

    const result: MetricsConversionDto = {
      company_id: companyId,
      from: parsed.from.toISOString(),
      to: parsed.to.toISOString(),
      funnel,
    };

    await this.cache.setJson(key, result);
    return result;
  }

  async byCenturion(companyId: string, range: { from?: string; to?: string }): Promise<MetricsByCenturionDto> {
    const parsed = parseRange(range.from, range.to);
    const key = await this.cacheKey(companyId, "by-centurion", parsed);
    const cached = await this.cache.getJson<MetricsByCenturionDto>(key);
    if (cached) return cached;

    const leads = await this.loadLeads(companyId, parsed.from, parsed.to);
    const centurions = await this.loadCenturions(companyId);
    const nameById = new Map(centurions.map((c) => [c.id, c.name]));

    const byId: Record<string, { total: number; qualified: number }> = {};
    for (const lead of leads) {
      const id = lead.centurion_id ?? "unassigned";
      byId[id] ??= { total: 0, qualified: 0 };
      byId[id].total += 1;
      if (lead.is_qualified) byId[id].qualified += 1;
    }

    const items = Object.entries(byId)
      .map(([centurionId, stats]) => ({
        centurion_id: centurionId,
        centurion_name: centurionId === "unassigned" ? "Sem centurion" : nameById.get(centurionId) ?? centurionId,
        total_leads: stats.total,
        qualified_leads: stats.qualified,
        conversion_rate: stats.total ? stats.qualified / stats.total : 0,
      }))
      .sort((a, b) => b.total_leads - a.total_leads);

    const result: MetricsByCenturionDto = {
      company_id: companyId,
      from: parsed.from.toISOString(),
      to: parsed.to.toISOString(),
      items,
    };

    await this.cache.setJson(key, result);
    return result;
  }

  async timeline(companyId: string, range: { from?: string; to?: string }): Promise<MetricsTimelineDto> {
    const parsed = parseRange(range.from, range.to);
    const key = await this.cacheKey(companyId, "timeline", parsed);
    const cached = await this.cache.getJson<MetricsTimelineDto>(key);
    if (cached) return cached;

    const leads = await this.loadLeads(companyId, parsed.from, parsed.to);
    const contracts = await this.loadSignedContracts(companyId, parsed.from, parsed.to);

    const points: Record<string, { created: number; qualified: number; signed: number }> = {};
    for (const lead of leads) {
      const day = asDay(new Date(lead.created_at));
      points[day] ??= { created: 0, qualified: 0, signed: 0 };
      points[day].created += 1;

      if (lead.qualified_at) {
        const qDay = asDay(new Date(lead.qualified_at));
        points[qDay] ??= { created: 0, qualified: 0, signed: 0 };
        points[qDay].qualified += 1;
      }
    }

    for (const c of contracts) {
      if (!c.signed_at) continue;
      const day = asDay(new Date(c.signed_at));
      points[day] ??= { created: 0, qualified: 0, signed: 0 };
      points[day].signed += 1;
    }

    const days = Object.keys(points).sort();
    const result: MetricsTimelineDto = {
      company_id: companyId,
      from: parsed.from.toISOString(),
      to: parsed.to.toISOString(),
      points: days.map((d) => ({
        date: d,
        leads_created: points[d].created,
        leads_qualified: points[d].qualified,
        contracts_signed: points[d].signed,
      })),
    };

    await this.cache.setJson(key, result);
    return result;
  }

  private async loadLeads(companyId: string, from: Date, to: Date): Promise<LeadRow[]> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("leads")
      .select("id, lifecycle_stage, is_qualified, created_at, qualified_at, centurion_id")
      .eq("company_id", companyId)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new ValidationError("Failed to load leads for metrics", { error });
    return (data ?? []) as unknown as LeadRow[];
  }

  private async loadSignedContracts(companyId: string, from: Date, to: Date): Promise<ContractRow[]> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("contracts")
      .select("id, signed_at")
      .eq("company_id", companyId)
      .not("signed_at", "is", null)
      .gte("signed_at", from.toISOString())
      .lte("signed_at", to.toISOString())
      .order("signed_at", { ascending: false })
      .limit(5000);
    if (error) throw new ValidationError("Failed to load contracts for metrics", { error });
    return (data ?? []) as unknown as ContractRow[];
  }

  private async loadCenturions(companyId: string): Promise<CenturionRow[]> {
    const { data, error } = await this.admin()
      .schema("core")
      .from("centurion_configs")
      .select("id, name")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw new ValidationError("Failed to load centurions for metrics", { error });
    return (data ?? []) as unknown as CenturionRow[];
  }
}

