import { ValidationError } from "@wolfgang/contracts";

import { McpService } from "./mcp.service";

function createQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    order: jest.fn(() => q),
    insert: jest.fn(() => q),
    delete: jest.fn(() => q),
    single: jest.fn().mockResolvedValue(result),
  };
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return q;
}

describe("McpService", () => {
  beforeEach(() => {
    process.env.APP_ENCRYPTION_KEY_CURRENT = "test-key";
  });

  afterEach(() => {
    delete process.env.APP_ENCRYPTION_KEY_CURRENT;
  });

  it("list returns data and throws on error", async () => {
    const q = createQuery({
      data: [
        {
          id: "s1",
          company_id: "c1",
          centurion_id: "cent1",
          name: "srv",
          server_url: "http://mcp",
          auth_type: null,
          auth_config: {},
          auth_secrets_enc: "",
          tools_available: [],
          last_tools_sync_at: null,
          is_active: true,
          connection_status: "unknown",
          last_error: null,
          created_at: "2025-01-01T00:00:00.000Z",
          updated_at: "2025-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new McpService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.list("c1", "cent1")).resolves.toEqual([
      expect.objectContaining({
        id: "s1",
        auth_config: {},
        has_auth_secrets: false,
      }),
    ]);

    q.then = (resolve: any, reject: any) => Promise.resolve({ data: null, error: { message: "fail" } }).then(resolve, reject);
    await expect(service.list("c1", "cent1")).rejects.toBeInstanceOf(ValidationError);
  });

  it("create applies defaults", async () => {
    const q = createQuery({ data: { id: "s1" }, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new McpService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await service.create("c1", "cent1", { name: "MCP", server_url: "http://mcp" } as any);
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        auth_config: {},
        auth_secrets_enc: "",
        is_active: true,
      }),
    );
  });

  it("delete throws ValidationError on error", async () => {
    const q = createQuery({ data: null, error: { message: "fail" } });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new McpService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.delete("c1", "cent1", "s1")).rejects.toBeInstanceOf(ValidationError);
  });
});
