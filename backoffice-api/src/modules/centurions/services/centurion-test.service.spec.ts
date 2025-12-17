import { ValidationError } from "@wolfgang/contracts";

import { CenturionTestService } from "./centurion-test.service";

describe("CenturionTestService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AGENT_RUNTIME_URL;
  });

  it("calls Agent Runtime and returns response", async () => {
    process.env.AGENT_RUNTIME_URL = "http://agent-runtime:5000";

    const centurions = { get: jest.fn().mockResolvedValue({ id: "cent1" }) } as any;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ response: "Hello", model: "gpt-test", usage: { total_tokens: 10 } }),
    } as any);

    const service = new CenturionTestService(centurions);
    const res = await service.run("c1", "cent1", "hi", { requestId: "r1", correlationId: "c0" });

    expect(centurions.get).toHaveBeenCalledWith("c1", "cent1");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://agent-runtime:5000/centurions/cent1/test",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-request-id": "r1",
          "x-correlation-id": "c0",
          "x-company-id": "c1",
        }),
      }),
    );
    expect(res).toMatchObject({ ok: true, response: "Hello", model: "gpt-test" });
  });

  it("throws ValidationError on non-2xx response", async () => {
    const centurions = { get: jest.fn().mockResolvedValue({ id: "cent1" }) } as any;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "bad",
    } as any);

    const service = new CenturionTestService(centurions);
    await expect(service.run("c1", "cent1", "hi")).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws timeout ValidationError when fetch is aborted", async () => {
    const centurions = { get: jest.fn().mockResolvedValue({ id: "cent1" }) } as any;
    const abortErr = new Error("aborted");
    (abortErr as any).name = "AbortError";
    global.fetch = jest.fn().mockRejectedValue(abortErr);

    const service = new CenturionTestService(centurions);
    await expect(service.run("c1", "cent1", "hi")).rejects.toBeInstanceOf(ValidationError);
  });
});

