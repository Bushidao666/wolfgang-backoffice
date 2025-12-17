import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { DealsService } from "./deals.service";

function createQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    gte: jest.fn(() => q),
    lte: jest.fn(() => q),
    or: jest.fn(() => q),
    order: jest.fn(() => q),
    limit: jest.fn(() => q),
    maybeSingle: jest.fn(),
  };
  q.then = (onFulfilled: any, onRejected: any) => Promise.resolve(result).then(onFulfilled, onRejected);
  return q;
}

describe("DealsService", () => {
  it("list applies filters and returns deals", async () => {
    const companyCrmsQuery = createQuery(null);
    companyCrmsQuery.maybeSingle.mockResolvedValue({ data: { schema_name: "tenant_a" }, error: null });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return companyCrmsQuery;
          throw new Error("unexpected");
        }),
      })),
    };
    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;
    const postgres = { query: jest.fn().mockResolvedValue({ rows: [{ id: "d1", deal_status: "new" }] }) } as any;

    const service = new DealsService(supabase, postgres);
    const res = await service.list("c1", { status: "new", q: "john" });

    expect(res).toEqual([{ id: "d1", deal_status: "new" }]);
    expect(postgres.query).toHaveBeenCalledTimes(1);
    const [sql, params] = postgres.query.mock.calls[0];
    expect(String(sql)).toContain('from "tenant_a".deals');
    expect(String(sql)).toContain("where company_id = $1");
    expect(String(sql)).toContain("deal_status = $2");
    expect(String(sql)).toContain("deal_full_name ilike $3");
    expect(params).toEqual(["c1", "new", "%john%"]);
  });

  it("list applies date filters and throws on query error", async () => {
    const companyCrmsQuery = createQuery(null);
    companyCrmsQuery.maybeSingle.mockResolvedValue({ data: { schema_name: "tenant_a" }, error: null });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return companyCrmsQuery;
          throw new Error("unexpected");
        }),
      })),
    };
    const postgres = { query: jest.fn().mockRejectedValue(new Error("fail")) } as any;
    const service = new DealsService({ getAdminClient: jest.fn(() => admin as any) } as any, postgres);

    await expect(service.list("c1", { from: "2025-01-01", to: "2025-01-02" })).rejects.toBeInstanceOf(ValidationError);
    const [sql, params] = postgres.query.mock.calls[0];
    expect(String(sql)).toContain("created_at >= $2");
    expect(String(sql)).toContain("created_at <= $3");
    expect(params).toEqual(["c1", "2025-01-01", "2025-01-02"]);
  });

  it("get throws NotFoundError when missing", async () => {
    const companyCrmsQuery = createQuery(null);
    companyCrmsQuery.maybeSingle.mockResolvedValue({ data: { schema_name: "tenant_a" }, error: null });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return companyCrmsQuery;
          throw new Error("unexpected");
        }),
      })),
    };
    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;
    const postgres = { query: jest.fn().mockResolvedValue({ rows: [] }) } as any;

    const service = new DealsService(supabase, postgres);
    await expect(service.get("c1", "d1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("stats counts statuses", async () => {
    const companyCrmsQuery = createQuery(null);
    companyCrmsQuery.maybeSingle.mockResolvedValue({ data: { schema_name: "tenant_a" }, error: null });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return companyCrmsQuery;
          throw new Error("unexpected");
        }),
      })),
    };
    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;
    const postgres = {
      query: jest.fn().mockResolvedValue({ rows: [{ deal_status: "new" }, { deal_status: "won" }, { deal_status: "new" }] }),
    } as any;

    const service = new DealsService(supabase, postgres);
    const res = await service.stats("c1");

    expect(res.total).toBe(3);
    expect(res.by_status).toEqual({ new: 2, won: 1 });
  });

  it("throws ValidationError for invalid schema name", async () => {
    const companyCrmsQuery = createQuery(null);
    companyCrmsQuery.maybeSingle.mockResolvedValue({ data: { schema_name: "bad schema" }, error: null });

    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn(() => companyCrmsQuery),
      })),
    };
    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;

    const postgres = { query: jest.fn() } as any;
    const service = new DealsService(supabase, postgres);
    await expect(service.list("c1", {})).rejects.toBeInstanceOf(ValidationError);
    expect(postgres.query).not.toHaveBeenCalled();
  });

  it("timeline loads messages and contracts when linked", async () => {
    const companyCrmsQuery = createQuery(null);
    companyCrmsQuery.maybeSingle.mockResolvedValue({ data: { schema_name: "tenant_a" }, error: null });

    const idxQuery = createQuery(null);
    idxQuery.maybeSingle.mockResolvedValue({ data: { id: "idx1" }, error: null });

    const messagesQuery = createQuery({ data: [{ id: "m1" }], error: null });
    const contractsQuery = createQuery({ data: [{ id: "c1" }], error: null });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return companyCrmsQuery;
          if (schemaName === "core" && table === "deals_index") return idxQuery;
          if (schemaName === "core" && table === "messages") return messagesQuery;
          if (schemaName === "core" && table === "contracts") return contractsQuery;
          throw new Error("unexpected");
        }),
      })),
    };

    const postgres = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: "d1", company_id: "c1", core_lead_id: "lead1" }] }),
    } as any;
    const service = new DealsService({ getAdminClient: jest.fn(() => admin as any) } as any, postgres);
    const res = await service.timeline("c1", "d1");

    expect(res.deal_index_id).toBe("idx1");
    expect(res.lead_id).toBe("lead1");
    expect(res.messages).toEqual([{ id: "m1" }]);
    expect(res.contracts).toEqual([{ id: "c1" }]);
    expect(postgres.query).toHaveBeenCalledWith(expect.stringContaining('from "tenant_a".deals'), ["d1", "c1"]);
  });

  it("timeline skips messages/contracts when missing lead and index", async () => {
    const companyCrmsQuery = createQuery(null);
    companyCrmsQuery.maybeSingle.mockResolvedValue({ data: { schema_name: "tenant_a" }, error: null });

    const idxQuery = createQuery(null);
    idxQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return companyCrmsQuery;
          if (schemaName === "core" && table === "deals_index") return idxQuery;
          throw new Error("unexpected");
        }),
      })),
    };

    const postgres = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: "d1", company_id: "c1", core_lead_id: null }] }),
    } as any;
    const service = new DealsService({ getAdminClient: jest.fn(() => admin as any) } as any, postgres);
    const res = await service.timeline("c1", "d1");

    expect(res.deal_index_id).toBeNull();
    expect(res.lead_id).toBeNull();
    expect(res.messages).toEqual([]);
    expect(res.contracts).toEqual([]);
  });
});
