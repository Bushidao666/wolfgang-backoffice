import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { PixelsService } from "./pixels.service";

function createThenableQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    order: jest.fn(() => q),
    limit: jest.fn(() => q),
    gte: jest.fn(() => q),
    lte: jest.fn(() => q),
    update: jest.fn(() => q),
    delete: jest.fn(() => q),
    insert: jest.fn(() => q),
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

describe("PixelsService", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.APP_ENCRYPTION_KEY = "test-encryption-key";
    process.env.FACEBOOK_API_VERSION = "v20.0";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.APP_ENCRYPTION_KEY;
    delete process.env.FACEBOOK_API_VERSION;
  });

  it("create validates pixel_id", async () => {
    const service = new PixelsService({ getAdminClient: jest.fn() } as any);
    await expect(service.create("c1", { pixel_id: "abc", meta_access_token: "t" } as any)).rejects.toBeInstanceOf(ValidationError);
  });

  it("create throws when APP_ENCRYPTION_KEY is missing", async () => {
    delete process.env.APP_ENCRYPTION_KEY;
    const service = new PixelsService({ getAdminClient: jest.fn() } as any);
    await expect(service.create("c1", { pixel_id: "123456", meta_access_token: "t" } as any)).rejects.toBeInstanceOf(ValidationError);
  });

  it("list maps to response shape", async () => {
    const q = createThenableQuery({
      data: [
        {
          id: "p1",
          company_id: "c1",
          pixel_id: "123456",
          meta_access_token: "v1:encrypted",
          meta_test_event_code: null,
          domain: null,
          is_active: false,
          created_at: "now",
          updated_at: "now",
        },
      ],
      error: null,
    });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new PixelsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    const res = await service.list("c1");
    expect(res).toEqual([expect.objectContaining({ id: "p1", has_access_token: true, is_active: false })]);
  });

  it("create encrypts token and returns response without token", async () => {
    let inserted: any = null;
    const insertQuery: any = {
      insert: jest.fn((row: any) => {
        inserted = row;
        return insertQuery;
      }),
      select: jest.fn(() => insertQuery),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "p1",
          company_id: "c1",
          pixel_id: "123456",
          meta_access_token: "v1:encrypted",
          meta_test_event_code: null,
          domain: null,
          is_active: true,
          created_at: "now",
          updated_at: "now",
        },
        error: null,
      }),
    };

    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => insertQuery) })) };
    const service = new PixelsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    const res = await service.create("c1", { pixel_id: " 123456 ", meta_access_token: "tok" } as any);
    expect(inserted.meta_access_token).toMatch(/^v1:/);
    expect(res).toMatchObject({ id: "p1", pixel_id: "123456", has_access_token: true });
    expect((res as any).meta_access_token).toBeUndefined();
  });

  it("update returns response and encrypts access token when provided", async () => {
    let patch: any = null;
    const q = createMaybeSingleQuery({
      data: {
        id: "p1",
        company_id: "c1",
        pixel_id: "123456",
        meta_access_token: "v1:encrypted",
        meta_test_event_code: "X",
        domain: null,
        is_active: false,
        created_at: "now",
        updated_at: "now",
      },
      error: null,
    });
    q.update = jest.fn((p: any) => {
      patch = p;
      return q;
    });
    q.select = jest.fn(() => q);

    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new PixelsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    const res = await service.update("c1", "p1", { meta_access_token: "new-token", is_active: false } as any);
    expect(patch.meta_access_token).toMatch(/^v1:/);
    expect(res).toMatchObject({ id: "p1", is_active: false, has_access_token: true });
  });

  it("update throws NotFoundError when record is missing", async () => {
    const q = createMaybeSingleQuery({ data: null, error: null });
    q.update = jest.fn(() => q);

    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new PixelsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.update("c1", "p1", { domain: "x" } as any)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("delete throws ValidationError on error", async () => {
    const q = createThenableQuery({ data: null, error: { message: "fail" } });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new PixelsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.delete("c1", "p1")).rejects.toBeInstanceOf(ValidationError);
  });

  it("listEvents applies optional filters", async () => {
    const pixelQuery = createMaybeSingleQuery({ data: { pixel_id: "123" }, error: null });
    const logsQuery = createThenableQuery({ data: [{ id: "e1" }], error: null });

    const from = jest.fn((table: string) => {
      if (table === "pixel_configs") return pixelQuery;
      if (table === "capi_event_logs") return logsQuery;
      throw new Error(`unexpected table ${table}`);
    });

    const admin = { schema: jest.fn(() => ({ from })) };
    const service = new PixelsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await service.listEvents("c1", "p1", { status: "failed", from: "2025-01-01", to: "2025-01-02" });
    expect(logsQuery.eq).toHaveBeenCalledWith("status", "failed");
    expect(logsQuery.gte).toHaveBeenCalledWith("created_at", "2025-01-01");
    expect(logsQuery.lte).toHaveBeenCalledWith("created_at", "2025-01-02");
  });

  it("test validates meta_test_event_code", async () => {
    const pixelGetQuery = createMaybeSingleQuery({ data: { pixel_id: "123456", meta_access_token: "plain-token", meta_test_event_code: null }, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => pixelGetQuery) })) };
    const service = new PixelsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.test("c1", "p1")).rejects.toBeInstanceOf(ValidationError);
  });

  it("test uses plain token when value is not encrypted", async () => {
    const pixelGetQuery = createMaybeSingleQuery({
      data: { pixel_id: "123456", meta_access_token: "plain-token", meta_test_event_code: "TEST", domain: null },
      error: null,
    });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => pixelGetQuery) })) };
    const service = new PixelsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as any);

    await service.test("c1", "p1");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("access_token=plain-token"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("test decrypts token and calls Meta endpoint", async () => {
    const supabase = { getAdminClient: jest.fn() } as any;
    const service = new PixelsService(supabase);

    let encryptedToken = "";
    const insertQuery: any = {
      insert: jest.fn((row: any) => {
        encryptedToken = row.meta_access_token;
        return insertQuery;
      }),
      select: jest.fn(() => insertQuery),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "p1",
          company_id: "c1",
          pixel_id: "123456",
          meta_access_token: "v1:encrypted",
          meta_test_event_code: "TEST",
          domain: "http://example.com",
          is_active: true,
          created_at: "now",
          updated_at: "now",
        },
        error: null,
      }),
    };

    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn((table: string) => {
          if (table === "pixel_configs") return insertQuery;
          throw new Error(`unexpected table ${table}`);
        }),
      })),
    };
    supabase.getAdminClient.mockReturnValueOnce(admin as any);

    await service.create("c1", { pixel_id: "123456", meta_access_token: "secret-token", meta_test_event_code: "TEST" } as any);

    const pixelGetQuery = createMaybeSingleQuery({
      data: { pixel_id: "123456", meta_access_token: encryptedToken, meta_test_event_code: "TEST", domain: "http://example.com" },
      error: null,
    });

    const admin2 = {
      schema: jest.fn(() => ({
        from: jest.fn((table: string) => {
          if (table === "pixel_configs") return pixelGetQuery;
          throw new Error(`unexpected table ${table}`);
        }),
      })),
    };
    supabase.getAdminClient.mockReturnValueOnce(admin2 as any);

    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as any);

    await service.test("c1", "p1");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("access_token=secret-token"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
