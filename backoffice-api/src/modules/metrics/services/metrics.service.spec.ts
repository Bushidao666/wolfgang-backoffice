import { ValidationError } from "@wolfgang/contracts";

import { MetricsService } from "./metrics.service";

function createThenableQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    gte: jest.fn(() => q),
    lte: jest.fn(() => q),
    not: jest.fn(() => q),
    order: jest.fn(() => q),
    limit: jest.fn(() => q),
  };
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return q;
}

describe("MetricsService", () => {
  it("throws ValidationError on invalid date range", async () => {
    const supabase = { getAdminClient: jest.fn(() => ({ schema: jest.fn() })) } as any;
    const cache = { getCompanyBust: jest.fn(), getJson: jest.fn(), setJson: jest.fn() } as any;
    const service = new MetricsService(supabase, cache);

    await expect(service.summary("c1", { from: "not-a-date" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns cached values without querying Supabase", async () => {
    const admin = { schema: jest.fn() };
    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;
    const cache = {
      getCompanyBust: jest.fn().mockResolvedValue("0"),
      getJson: jest.fn().mockResolvedValue({ company_id: "c1", total_leads: 123 }),
      setJson: jest.fn(),
    } as any;
    const service = new MetricsService(supabase, cache);

    const res = await service.summary("c1", {});
    expect(res).toMatchObject({ company_id: "c1", total_leads: 123 });
    expect(admin.schema).not.toHaveBeenCalled();
  });

  it("computes summary metrics and caches result", async () => {
    const leads = [
      {
        id: "l1",
        lifecycle_stage: "new",
        is_qualified: false,
        created_at: "2025-01-01T00:00:00.000Z",
        qualified_at: null,
        centurion_id: "cent1",
      },
      {
        id: "l2",
        lifecycle_stage: "qualified",
        is_qualified: true,
        created_at: "2025-01-02T00:00:00.000Z",
        qualified_at: "2025-01-02T01:00:00.000Z",
        centurion_id: null,
      },
    ];

    const leadsQuery = createThenableQuery({ data: leads, error: null });
    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn(() => leadsQuery),
      })),
    };

    const cache = {
      getCompanyBust: jest.fn().mockResolvedValue("b1"),
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new MetricsService({ getAdminClient: jest.fn(() => admin as any) } as any, cache);

    const res = await service.summary("c1", {
      from: "2025-01-01T00:00:00.000Z",
      to: "2025-01-03T00:00:00.000Z",
    });

    expect(res.total_leads).toBe(2);
    expect(res.qualified_leads).toBe(1);
    expect(res.conversion_rate).toBe(0.5);
    expect(res.avg_qualification_seconds).toBe(3600);
    expect(res.by_stage).toMatchObject({ new: 1, qualified: 1 });
    expect(cache.setJson).toHaveBeenCalled();
  });

  it("groups by centurion including unassigned", async () => {
    const leadsQuery = createThenableQuery({
      data: [
        { id: "l1", lifecycle_stage: "new", is_qualified: true, created_at: "2025-01-01T00:00:00.000Z", qualified_at: null, centurion_id: "cent1" },
        { id: "l2", lifecycle_stage: "new", is_qualified: false, created_at: "2025-01-01T00:00:00.000Z", qualified_at: null, centurion_id: null },
      ],
      error: null,
    });
    const centurionsQuery = createThenableQuery({ data: [{ id: "cent1", name: "Alpha" }], error: null });

    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn((table: string) => {
          if (table === "leads") return leadsQuery;
          if (table === "centurion_configs") return centurionsQuery;
          throw new Error(`Unexpected table: ${table}`);
        }),
      })),
    };

    const cache = { getCompanyBust: jest.fn().mockResolvedValue("0"), getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn() } as any;
    const service = new MetricsService({ getAdminClient: jest.fn(() => admin as any) } as any, cache);

    const res = await service.byCenturion("c1", {});
    expect(res.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ centurion_id: "cent1", centurion_name: "Alpha", total_leads: 1, qualified_leads: 1 }),
        expect.objectContaining({ centurion_id: "unassigned", centurion_name: "Sem centurion", total_leads: 1, qualified_leads: 0 }),
      ]),
    );
  });

  it("builds conversion funnel", async () => {
    const leadsQuery = createThenableQuery({
      data: [
        { id: "l1", lifecycle_stage: "new", is_qualified: false, created_at: "2025-01-01T00:00:00.000Z", qualified_at: null, centurion_id: null },
        { id: "l2", lifecycle_stage: "qualified", is_qualified: true, created_at: "2025-01-02T00:00:00.000Z", qualified_at: null, centurion_id: null },
      ],
      error: null,
    });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => leadsQuery) })) };

    const cache = { getCompanyBust: jest.fn().mockResolvedValue("0"), getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn() } as any;
    const service = new MetricsService({ getAdminClient: jest.fn(() => admin as any) } as any, cache);

    const res = await service.conversion("c1", {});
    expect(res.funnel).toEqual({ new: 1, qualified: 1 });
  });

  it("builds timeline points for leads and signed contracts", async () => {
    const leadsQuery = createThenableQuery({
      data: [
        { id: "l1", lifecycle_stage: "new", is_qualified: false, created_at: "2025-01-01T10:00:00.000Z", qualified_at: null, centurion_id: null },
        { id: "l2", lifecycle_stage: "new", is_qualified: true, created_at: "2025-01-01T12:00:00.000Z", qualified_at: "2025-01-02T08:00:00.000Z", centurion_id: null },
      ],
      error: null,
    });
    const contractsQuery = createThenableQuery({
      data: [{ id: "c1", signed_at: "2025-01-02T09:00:00.000Z" }],
      error: null,
    });

    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn((table: string) => {
          if (table === "leads") return leadsQuery;
          if (table === "contracts") return contractsQuery;
          throw new Error(`Unexpected table: ${table}`);
        }),
      })),
    };

    const cache = { getCompanyBust: jest.fn().mockResolvedValue("0"), getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn() } as any;
    const service = new MetricsService({ getAdminClient: jest.fn(() => admin as any) } as any, cache);

    const res = await service.timeline("c1", {});
    expect(res.points).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: "2025-01-01", leads_created: 2 }),
        expect.objectContaining({ date: "2025-01-02", leads_qualified: 1, contracts_signed: 1 }),
      ]),
    );
  });
});
