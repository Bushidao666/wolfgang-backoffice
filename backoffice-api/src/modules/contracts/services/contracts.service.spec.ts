import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { ContractsService } from "./contracts.service";

function createThenableQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    order: jest.fn(() => q),
    maybeSingle: jest.fn(),
  };
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
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

describe("ContractsService", () => {
  it("create throws NotFoundError when deal is missing", async () => {
    const crmQuery = createMaybeSingleQuery({ data: { schema_name: "crm1" }, error: null });
    const dealQuery = createMaybeSingleQuery({ data: null, error: null });
    const idxQuery = createMaybeSingleQuery({ data: null, error: null });

    const admin = {
      schema: jest.fn((schemaName: string) => ({
        from: jest.fn((table: string) => {
          if (schemaName === "core" && table === "company_crms") return crmQuery;
          if (schemaName === "core" && table === "deals_index") return idxQuery;
          if (schemaName === "crm1" && table === "deals") return dealQuery;
          throw new Error(`unexpected table ${schemaName}.${table}`);
        }),
      })),
    };

    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;
    const autentique = { createContract: jest.fn() } as any;

    const service = new ContractsService(supabase, autentique);

    await expect(service.create("c1", { deal_id: "d1", template_id: "t1" } as any)).rejects.toBeInstanceOf(NotFoundError);
    expect(autentique.createContract).not.toHaveBeenCalled();
    expect(admin.schema).toHaveBeenCalledWith("crm1");
  });

  it("create passes contract value from deal when dto.value is missing", async () => {
    const crmQuery = createMaybeSingleQuery({ data: { schema_name: "crm1" }, error: null });
    const idxQuery = createMaybeSingleQuery({ data: { id: "idx1" }, error: null });
    const dealQuery = createMaybeSingleQuery({
      data: {
        id: "d1",
        company_id: "c1",
        core_lead_id: "l1",
        deal_full_name: "John",
        deal_phone: "+1",
        deal_email: "a@b.com",
        deal_valor_contrato: "1000",
      },
      error: null,
    });

    const schema = jest.fn((schemaName: string) => {
      const from = jest.fn((table: string) => {
        if (schemaName === "core" && table === "company_crms") return crmQuery;
        if (schemaName === "core" && table === "deals_index") return idxQuery;
        if (schemaName === "crm1" && table === "deals") return dealQuery;
        return createThenableQuery({ data: [], error: null });
      });
      return { from };
    });

    const admin = { schema, storage: { from: jest.fn() } };
    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;
    const autentique = { createContract: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const service = new ContractsService(supabase, autentique);

    await service.create("c1", { deal_id: "d1", template_id: "t1" } as any, { requestId: "r1", correlationId: "c0" });
    expect(autentique.createContract).toHaveBeenCalledWith(expect.objectContaining({ value: 1000 }), { requestId: "r1", correlationId: "c0" });
  });

  it("create rejects invalid contract value", async () => {
    const crmQuery = createMaybeSingleQuery({ data: { schema_name: "crm1" }, error: null });
    const idxQuery = createMaybeSingleQuery({ data: { id: "idx1" }, error: null });
    const dealQuery = createMaybeSingleQuery({ data: { id: "d1", company_id: "c1", core_lead_id: "l1", deal_valor_contrato: 10 }, error: null });

    const schema = jest.fn((schemaName: string) => {
      const from = jest.fn((table: string) => {
        if (schemaName === "core" && table === "company_crms") return crmQuery;
        if (schemaName === "core" && table === "deals_index") return idxQuery;
        if (schemaName === "crm1" && table === "deals") return dealQuery;
        return createThenableQuery({ data: [], error: null });
      });
      return { from };
    });

    const supabase = { getAdminClient: jest.fn(() => ({ schema }) as any) } as any;
    const service = new ContractsService(supabase, { createContract: jest.fn() } as any);

    await expect(service.create("c1", { deal_id: "d1", template_id: "t1", value: -1 } as any)).rejects.toBeInstanceOf(ValidationError);
  });

  it("download returns signed URL when signed_file_path exists", async () => {
    const contractQuery = createMaybeSingleQuery({
      data: { id: "ct1", company_id: "c1", contract_data: { signed_file_path: "deal_files/x.pdf" } },
      error: null,
    });
    const signedUrl = { signedUrl: "http://signed" };
    const storageBucket = { createSignedUrl: jest.fn().mockResolvedValue({ data: signedUrl, error: null }) };

    const schema = jest.fn(() => ({ from: jest.fn(() => contractQuery) }));
    const admin = { schema, storage: { from: jest.fn(() => storageBucket) } };

    const service = new ContractsService({ getAdminClient: jest.fn(() => admin as any) } as any, {} as any);

    await expect(service.download("c1", "ct1")).resolves.toEqual({ url: "http://signed" });
  });

  it("download falls back to contract_url", async () => {
    const contractQuery = createMaybeSingleQuery({
      data: { id: "ct1", company_id: "c1", contract_data: {}, contract_url: "http://contract" },
      error: null,
    });

    const schema = jest.fn(() => ({ from: jest.fn(() => contractQuery) }));
    const admin = { schema, storage: { from: jest.fn() } };

    const service = new ContractsService({ getAdminClient: jest.fn(() => admin as any) } as any, {} as any);

    await expect(service.download("c1", "ct1")).resolves.toEqual({ url: "http://contract" });
  });

  it("download throws NotFoundError when no signed contract is available", async () => {
    const contractQuery = createMaybeSingleQuery({ data: { id: "ct1", company_id: "c1", contract_data: {} }, error: null });

    const schema = jest.fn(() => ({ from: jest.fn(() => contractQuery) }));
    const admin = { schema, storage: { from: jest.fn() } };

    const service = new ContractsService({ getAdminClient: jest.fn(() => admin as any) } as any, {} as any);

    await expect(service.download("c1", "ct1")).rejects.toBeInstanceOf(NotFoundError);
  });
});
