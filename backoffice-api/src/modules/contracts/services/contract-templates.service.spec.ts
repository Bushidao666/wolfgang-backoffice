import { ValidationError } from "@wolfgang/contracts";

import { ContractTemplatesService } from "./contract-templates.service";

function createThenableQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    is: jest.fn(() => q),
    order: jest.fn(() => q),
    delete: jest.fn(() => q),
  };
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return q;
}

function createQuery(result: any) {
  const q: any = {
    insert: jest.fn(() => q),
    update: jest.fn(() => q),
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    maybeSingle: jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
  };
  return q;
}

describe("ContractTemplatesService", () => {
  it("list returns locals first then globals", async () => {
    const globalsQuery = createThenableQuery({ data: [{ id: "g1" }], error: null });
    const localsQuery = createThenableQuery({ data: [{ id: "l1" }], error: null });

    const from = jest
      .fn()
      .mockReturnValueOnce(globalsQuery)
      .mockReturnValueOnce(localsQuery);

    const admin = { schema: jest.fn(() => ({ from })) };
    const service = new ContractTemplatesService({ getAdminClient: jest.fn(() => admin as any) } as any);

    const res = await service.list("c1");
    expect(res).toEqual([{ id: "l1" }, { id: "g1" }]);
  });

  it("create requires a file and rolls back upload on insert error", async () => {
    const storageBucket = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    };

    const insertQuery = createQuery({ data: null, error: { message: "fail" } });

    const admin = {
      storage: { from: jest.fn(() => storageBucket) },
      schema: jest.fn(() => ({ from: jest.fn(() => insertQuery) })),
    };

    const service = new ContractTemplatesService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(
      service.create(
        "c1",
        { name: "T1", variables: "[]" } as any,
        { originalname: "contract.docx", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from("x") } as any,
      ),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(storageBucket.upload).toHaveBeenCalled();
    expect(storageBucket.remove).toHaveBeenCalled();
  });

  it("create throws when template file is missing", async () => {
    const admin = { storage: { from: jest.fn() }, schema: jest.fn() };
    const service = new ContractTemplatesService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.create("c1", { name: "T1", variables: "[]" } as any, undefined)).rejects.toBeInstanceOf(ValidationError);
  });

  it("create throws when upload fails", async () => {
    const storageBucket = {
      upload: jest.fn().mockResolvedValue({ error: { message: "upload-fail" } }),
      remove: jest.fn(),
    };

    const admin = { storage: { from: jest.fn(() => storageBucket) }, schema: jest.fn() };
    const service = new ContractTemplatesService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(
      service.create(
        "c1",
        { name: "T1", variables: "[]" } as any,
        { originalname: "contract.pdf", mimetype: "application/pdf", buffer: Buffer.from("x") } as any,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("update throws on invalid variables JSON", async () => {
    const q = createQuery({ data: { id: "t1" }, error: null });
    const admin = { storage: { from: jest.fn() }, schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new ContractTemplatesService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.update("c1", "t1", { name: "T1", variables: "{bad" } as any)).rejects.toBeInstanceOf(ValidationError);
  });

  it("update uploads new file when provided", async () => {
    const storageBucket = { upload: jest.fn().mockResolvedValue({ error: null }) };
    const q = createQuery({ data: { id: "t1", file_type: "pdf" }, error: null });
    q.update = jest.fn(() => q);

    const admin = { storage: { from: jest.fn(() => storageBucket) }, schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new ContractTemplatesService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await service.update(
      "c1",
      "t1",
      { name: "T1", variables: "[]" } as any,
      { originalname: "contract.pdf", mimetype: "application/pdf", buffer: Buffer.from("x") } as any,
    );

    expect(storageBucket.upload).toHaveBeenCalledWith(expect.stringContaining("/t1/"), expect.any(Buffer), expect.objectContaining({ upsert: true }));
  });

  it("update throws when template does not exist", async () => {
    const q = createQuery({ data: null, error: null });
    q.update = jest.fn(() => q);
    const admin = { storage: { from: jest.fn() }, schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new ContractTemplatesService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.update("c1", "t1", { name: "T1", variables: "[]" } as any)).rejects.toBeInstanceOf(ValidationError);
  });

  it("delete removes file when present", async () => {
    const fetchQuery = createQuery({ data: { file_path: "c1/t1/file.docx" }, error: null });
    const deleteQuery = createThenableQuery({ error: null });

    const storageBucket = { remove: jest.fn().mockResolvedValue({ error: null }) };

    const from = jest
      .fn()
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(deleteQuery);

    const admin = {
      storage: { from: jest.fn(() => storageBucket) },
      schema: jest.fn(() => ({ from })),
    };

    const service = new ContractTemplatesService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await service.delete("c1", "t1");
    expect(storageBucket.remove).toHaveBeenCalledWith(["c1/t1/file.docx"]);
  });

  it("delete throws when load fails", async () => {
    const fetchQuery = createQuery({ data: null, error: { message: "fail" } });
    const admin = { storage: { from: jest.fn() }, schema: jest.fn(() => ({ from: jest.fn(() => fetchQuery) })) };
    const service = new ContractTemplatesService({ getAdminClient: jest.fn(() => admin as any) } as any);

    await expect(service.delete("c1", "t1")).rejects.toBeInstanceOf(ValidationError);
  });
});
