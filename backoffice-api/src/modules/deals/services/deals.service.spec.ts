import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { DealsService } from "./deals.service";

function createThenableQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    gte: jest.fn(() => q),
    lte: jest.fn(() => q),
    or: jest.fn(() => q),
    order: jest.fn(() => q),
    limit: jest.fn(() => q),
  };
  q.then = (onFulfilled: any, onRejected: any) => Promise.resolve(result).then(onFulfilled, onRejected);
  return q;
}

function createMaybeSingleQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  return q;
}

describe("DealsService", () => {
  it("list applies filters and returns deals", async () => {
    const companyCrmsQuery = createMaybeSingleQuery({ data: { schema_name: "tenant_a" }, error: null });
    const dealsQuery = createThenableQuery({ data: [{ id: "d1", deal_status: "new" }], error: null });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return companyCrmsQuery;
          if (schemaName === "tenant_a" && table === "deals") return dealsQuery;
          throw new Error("unexpected");
        }),
      })),
    };
    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;

    const service = new DealsService(supabase);
    const res = await service.list("c1", { status: "new", q: "john" });

    expect(res).toEqual([{ id: "d1", deal_status: "new" }]);
    expect(admin.schema).toHaveBeenCalledWith("core");
    expect(admin.schema).toHaveBeenCalledWith("tenant_a");
    expect(dealsQuery.eq).toHaveBeenCalledWith("company_id", "c1");
    expect(dealsQuery.eq).toHaveBeenCalledWith("deal_status", "new");
    expect(dealsQuery.or).toHaveBeenCalledWith(expect.stringContaining("deal_full_name.ilike.%john%"));
  });

  it("list applies date filters and throws on query error", async () => {
    const companyCrmsQuery = createMaybeSingleQuery({ data: { schema_name: "tenant_a" }, error: null });
    const dealsQuery = createThenableQuery({ data: null, error: { message: "fail" } });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return companyCrmsQuery;
          if (schemaName === "tenant_a" && table === "deals") return dealsQuery;
          throw new Error(`unexpected ${schemaName}.${table}`);
        }),
      })),
    };
    const service = new DealsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.list("c1", { from: "2025-01-01", to: "2025-01-02" })).rejects.toBeInstanceOf(ValidationError);
    expect(dealsQuery.gte).toHaveBeenCalledWith("created_at", "2025-01-01");
    expect(dealsQuery.lte).toHaveBeenCalledWith("created_at", "2025-01-02");
  });

  it("get throws NotFoundError when missing", async () => {
    const companyCrmsQuery = createMaybeSingleQuery({ data: { schema_name: "tenant_a" }, error: null });
    const dealQuery = createMaybeSingleQuery({ data: null, error: null });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return companyCrmsQuery;
          if (schemaName === "tenant_a" && table === "deals") return dealQuery;
          throw new Error(`unexpected ${schemaName}.${table}`);
        }),
      })),
    };
    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;

    const service = new DealsService(supabase);
    await expect(service.get("c1", "d1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("stats counts statuses", async () => {
    const companyCrmsQuery = createMaybeSingleQuery({ data: { schema_name: "tenant_a" }, error: null });
    const dealsQuery = createThenableQuery({
      data: [{ deal_status: "new" }, { deal_status: "won" }, { deal_status: "new" }],
      error: null,
    });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return companyCrmsQuery;
          if (schemaName === "tenant_a" && table === "deals") return dealsQuery;
          throw new Error(`unexpected ${schemaName}.${table}`);
        }),
      })),
    };
    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;

    const service = new DealsService(supabase);
    const res = await service.stats("c1");

    expect(res.total).toBe(3);
    expect(res.by_status).toEqual({ new: 2, won: 1 });
  });

  it("throws ValidationError for invalid schema name", async () => {
    const companyCrmsQuery = createMaybeSingleQuery({ data: { schema_name: "bad schema" }, error: null });

    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn(() => companyCrmsQuery),
      })),
    };
    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;

    const service = new DealsService(supabase);
    await expect(service.list("c1", {})).rejects.toBeInstanceOf(ValidationError);
    expect(admin.schema).toHaveBeenCalledTimes(1);
  });

  it("timeline loads messages and contracts when linked", async () => {
    const companyCrmsQuery = createMaybeSingleQuery({ data: { schema_name: "tenant_a" }, error: null });
    const dealQuery = createMaybeSingleQuery({ data: { id: "d1", company_id: "c1", core_lead_id: "lead1" }, error: null });

    const idxQuery = createMaybeSingleQuery({ data: { id: "idx1" }, error: null });

    const messagesQuery = createThenableQuery({ data: [{ id: "m1" }], error: null });
    const contractsQuery = createThenableQuery({ data: [{ id: "c1" }], error: null });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return companyCrmsQuery;
          if (schemaName === "core" && table === "deals_index") return idxQuery;
          if (schemaName === "core" && table === "messages") return messagesQuery;
          if (schemaName === "core" && table === "contracts") return contractsQuery;
          if (schemaName === "tenant_a" && table === "deals") return dealQuery;
          throw new Error(`unexpected ${schemaName}.${table}`);
        }),
      })),
    };

    const service = new DealsService({ getAdminClient: jest.fn(() => admin as any) } as any);
    const res = await service.timeline("c1", "d1");

    expect(res.deal_index_id).toBe("idx1");
    expect(res.lead_id).toBe("lead1");
    expect(res.messages).toEqual([{ id: "m1" }]);
    expect(res.contracts).toEqual([{ id: "c1" }]);
  });

  it("timeline skips messages/contracts when missing lead and index", async () => {
    const companyCrmsQuery = createMaybeSingleQuery({ data: { schema_name: "tenant_a" }, error: null });
    const dealQuery = createMaybeSingleQuery({ data: { id: "d1", company_id: "c1", core_lead_id: null }, error: null });

    const idxQuery = createMaybeSingleQuery({ data: null, error: null });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return companyCrmsQuery;
          if (schemaName === "core" && table === "deals_index") return idxQuery;
          if (schemaName === "tenant_a" && table === "deals") return dealQuery;
          throw new Error(`unexpected ${schemaName}.${table}`);
        }),
      })),
    };

    const service = new DealsService({ getAdminClient: jest.fn(() => admin as any) } as any);
    const res = await service.timeline("c1", "d1");

    expect(res.deal_index_id).toBeNull();
    expect(res.lead_id).toBeNull();
    expect(res.messages).toEqual([]);
    expect(res.contracts).toEqual([]);
  });
});
