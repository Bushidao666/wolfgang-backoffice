import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { LeadsService } from "./leads.service";

function createLeadsQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    order: jest.fn(() => q),
    gte: jest.fn(() => q),
    lte: jest.fn(() => q),
    like: jest.fn(() => q),
    not: jest.fn(() => q),
    or: jest.fn(() => q),
    range: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  return q;
}

describe("LeadsService", () => {
  it("list applies channel filter by phone prefix", async () => {
    const leadsQuery = createLeadsQuery({ data: [{ id: "l1" }], error: null, count: 1 });

    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn(() => leadsQuery),
      })),
    };

    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;
    const service = new LeadsService(supabase);

    const res = await service.list("c1", { channel: "telegram", page: 1, per_page: 50 });

    expect(res.total).toBe(1);
    expect(leadsQuery.like).toHaveBeenCalledWith("phone", "telegram:%");
  });

  it("list throws ValidationError on query error", async () => {
    const leadsQuery = createLeadsQuery({ data: null, error: { message: "fail" }, count: null });

    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn(() => leadsQuery),
      })),
    };

    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;
    const service = new LeadsService(supabase);

    await expect(service.list("c1", { page: 1, per_page: 10 })).rejects.toBeInstanceOf(ValidationError);
  });

  it("list supports whatsapp channel filter and search term", async () => {
    const leadsQuery = createLeadsQuery({ data: [{ id: "l1" }], error: null, count: 1 });

    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn(() => leadsQuery),
      })),
    };

    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;
    const service = new LeadsService(supabase);

    const res = await service.list("c1", { channel: "whatsapp", q: "john", page: 2, per_page: 10 });

    expect(res.total).toBe(1);
    expect(leadsQuery.not).toHaveBeenCalledWith("phone", "like", "telegram:%");
    expect(leadsQuery.or).toHaveBeenCalledWith(expect.stringContaining("name.ilike.%john%"));
    expect(leadsQuery.range).toHaveBeenCalledWith(10, 19);
  });

  it("list applies status and date filters", async () => {
    const leadsQuery = createLeadsQuery({ data: [], error: null, count: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => leadsQuery) })) };
    const service = new LeadsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    const res = await service.list("c1", { status: "qualified", from: "2025-01-01", to: "2025-01-02", page: 1, per_page: 5 });

    expect(leadsQuery.eq).toHaveBeenCalledWith("lifecycle_stage", "qualified");
    expect(leadsQuery.gte).toHaveBeenCalledWith("created_at", "2025-01-01");
    expect(leadsQuery.lte).toHaveBeenCalledWith("created_at", "2025-01-02");
    expect(res.total).toBe(0);
  });

  it("get returns lead or throws NotFoundError", async () => {
    const leadQuery = createLeadsQuery({ data: null, error: null });
    leadQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn(() => leadQuery),
      })),
    };
    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;
    const service = new LeadsService(supabase);

    await expect(service.get("c1", "l1")).rejects.toBeInstanceOf(NotFoundError);

    leadQuery.maybeSingle.mockResolvedValueOnce({ data: { id: "l1" }, error: null });
    await expect(service.get("c1", "l1")).resolves.toMatchObject({ id: "l1" });
  });
});
