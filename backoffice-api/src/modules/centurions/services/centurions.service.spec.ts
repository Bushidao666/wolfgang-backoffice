import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { CenturionsService } from "./centurions.service";

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

describe("CenturionsService", () => {
  it("list returns data", async () => {
    const q = createQuery({ data: [{ id: "cent1" }], error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new CenturionsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.list("c1")).resolves.toEqual([{ id: "cent1" }]);
  });

  it("get throws NotFoundError when missing", async () => {
    const q = createQuery({ data: null, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new CenturionsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.get("c1", "cent1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("create applies defaults", async () => {
    const q = createQuery({ data: { id: "cent1" }, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new CenturionsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await service.create("c1", { name: "Alpha", slug: "alpha", prompt: "Hi" } as any);

    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        can_send_audio: true,
        can_send_image: true,
        can_send_video: true,
        can_process_audio: true,
        can_process_image: true,
        message_chunking_enabled: true,
        chunk_delay_ms: 1500,
        debounce_wait_ms: 3000,
        is_active: true,
        max_retries: 3,
        personality: {},
        qualification_rules: {},
      }),
    );
  });

  it("update builds patch only from provided fields", async () => {
    const q = createQuery({ data: { id: "cent1", name: "New" }, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new CenturionsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await service.update("c1", "cent1", { name: "New", personality: null } as any);

    expect(q.update).toHaveBeenCalledWith(expect.objectContaining({ name: "New", personality: {} }));
    expect(q.update).toHaveBeenCalledWith(expect.not.objectContaining({ slug: expect.anything() }));
  });

  it("update throws NotFoundError when centurion is missing", async () => {
    const q = createQuery({ data: null, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new CenturionsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.update("c1", "cent1", { name: "New" } as any)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("delete throws ValidationError on error", async () => {
    const q = createQuery({ data: null, error: { message: "fail" } });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new CenturionsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.delete("c1", "cent1")).rejects.toBeInstanceOf(ValidationError);
  });
});
