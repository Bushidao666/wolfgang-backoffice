import { ValidationError } from "@wolfgang/contracts";

import { TimelineService } from "./timeline.service";

function createTimelineQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    order: jest.fn(() => q),
    range: jest.fn().mockResolvedValue(result),
  };
  return q;
}

describe("TimelineService", () => {
  it("clamps limit/offset and uses range", async () => {
    const query = createTimelineQuery({ data: [{ id: "m1" }], error: null, count: 10 });
    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn(() => query),
      })),
    };

    const supabase = { getAdminClient: jest.fn(() => admin as any) } as any;
    const service = new TimelineService(supabase);

    const res = await service.getTimeline("c1", "l1", { limit: 999, offset: -5 });

    expect(res.limit).toBe(500);
    expect(res.offset).toBe(0);
    expect(query.range).toHaveBeenCalledWith(0, 499);
    expect(res.total).toBe(10);
  });

  it("falls back to data length when count is missing", async () => {
    const query = createTimelineQuery({ data: [{ id: "m1" }, { id: "m2" }], error: null, count: null });
    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn(() => query),
      })),
    };

    const service = new TimelineService({ getAdminClient: jest.fn(() => admin as any) } as any);

    const res = await service.getTimeline("c1", "l1", { limit: 2, offset: 0 });
    expect(res.total).toBe(2);
  });

  it("throws ValidationError when query fails", async () => {
    const query = createTimelineQuery({ data: null, error: { message: "fail" }, count: null });
    const admin = {
      schema: jest.fn(() => ({
        from: jest.fn(() => query),
      })),
    };

    const service = new TimelineService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.getTimeline("c1", "l1", { limit: 10, offset: 0 })).rejects.toBeInstanceOf(ValidationError);
  });
});

