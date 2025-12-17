import { ValidationError } from "@wolfgang/contracts";

import { ToolsService } from "./tools.service";

function createQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    order: jest.fn(() => q),
    insert: jest.fn(() => q),
    update: jest.fn(() => q),
    delete: jest.fn(() => q),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return q;
}

describe("ToolsService", () => {
  it("rejects invalid JSON schemas", async () => {
    const q = createQuery({ data: null, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new ToolsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(
      service.create("c1", "cent1", {
        tool_name: "x",
        endpoint: "http://example.com",
        input_schema: { type: "object", properties: { x: { type: "nope" } } },
      } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("create inserts with defaults", async () => {
    const q = createQuery({ data: { id: "t1" }, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new ToolsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    const dto = {
      tool_name: "search",
      endpoint: "http://example.com",
      input_schema: { type: "object", properties: { q: { type: "string" } }, required: ["q"] },
    };

    await service.create("c1", "cent1", dto as any);
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        headers: {},
        auth_config: {},
        timeout_ms: 10000,
        retry_count: 1,
        is_active: true,
      }),
    );
  });

  it("list returns data", async () => {
    const q = createQuery({ data: [{ id: "t1" }], error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new ToolsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.list("c1", "cent1")).resolves.toEqual([{ id: "t1" }]);
  });

  it("update throws when tool is missing", async () => {
    const q = createQuery({ data: null, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new ToolsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.update("c1", "cent1", "t1", { tool_name: "x" } as any)).rejects.toBeInstanceOf(ValidationError);
  });

  it("update validates output schema and returns updated tool", async () => {
    const q = createQuery({ data: { id: "t1", tool_name: "updated" }, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new ToolsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    const res = await service.update("c1", "cent1", "t1", {
      tool_name: "updated",
      output_schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
    } as any);

    expect(res).toMatchObject({ id: "t1", tool_name: "updated" });
  });

  it("delete throws ValidationError on failure", async () => {
    const q = createQuery({ data: null, error: { message: "fail" } });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new ToolsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.delete("c1", "cent1", "t1")).rejects.toBeInstanceOf(ValidationError);
  });
});
