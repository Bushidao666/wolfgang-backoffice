import { ValidationError } from "@wolfgang/contracts";

import { FollowupsService } from "./followups.service";

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

describe("FollowupsService", () => {
  it("list returns data and throws on error", async () => {
    const listQuery = createQuery({ data: [{ id: "r1" }], error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => listQuery) })) };
    const service = new FollowupsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.list("c1", "cent1")).resolves.toEqual([{ id: "r1" }]);

    listQuery.then = (resolve: any, reject: any) => Promise.resolve({ data: null, error: { message: "fail" } }).then(resolve, reject);
    await expect(service.list("c1", "cent1")).rejects.toBeInstanceOf(ValidationError);
  });

  it("create applies defaults", async () => {
    const q = createQuery({ data: { id: "r1", inactivity_hours: 24, max_attempts: 1, is_active: true }, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new FollowupsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await service.create("c1", "cent1", { name: "Rule", template: "Hello" } as any);
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        inactivity_hours: 24,
        max_attempts: 1,
        is_active: true,
      }),
    );
  });

  it("update throws when rule is missing", async () => {
    const q = createQuery({ data: null, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new FollowupsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.update("c1", "cent1", "r1", { name: "X", template: "T" } as any)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("delete throws ValidationError on error", async () => {
    const q = createQuery({ data: null, error: { message: "fail" } });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new FollowupsService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.delete("c1", "cent1", "r1")).rejects.toBeInstanceOf(ValidationError);
  });
});
