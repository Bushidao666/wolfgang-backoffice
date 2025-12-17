import { ValidationError } from "@wolfgang/contracts";

import { KbService } from "./kb.service";

function createThenableQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    order: jest.fn(() => q),
    range: jest.fn(() => q),
    delete: jest.fn(() => q),
    insert: jest.fn(() => q),
  };
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return q;
}

function createQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    insert: jest.fn(() => q),
    maybeSingle: jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
  };
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return q;
}

describe("KbService", () => {
  it("uploadDocument validates file type", async () => {
    const service = new KbService({ getAdminClient: jest.fn() } as any, { processDocument: jest.fn() } as any, { get: jest.fn() } as any);

    await expect(
      service.uploadDocument(
        "c1",
        "u1",
        { originalname: "file.exe", mimetype: "application/octet-stream", buffer: Buffer.from("x"), size: 1 } as any,
        "Title",
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("uploadDocument uploads file and inserts document record", async () => {
    const storageBucket = { upload: jest.fn().mockResolvedValue({ error: null }), remove: jest.fn() };

    let insertedRow: any = null;
    const insertQuery = createQuery({ data: { id: "doc1" }, error: null });
    insertQuery.insert.mockImplementation((row: any) => {
      insertedRow = row;
      return insertQuery;
    });

    const admin = {
      storage: { from: jest.fn(() => storageBucket) },
      schema: jest.fn(() => ({
        from: jest.fn(() => insertQuery),
      })),
    };

    const processor = { processDocument: jest.fn() };
    const service = new KbService(
      { getAdminClient: jest.fn(() => admin as any) } as any,
      processor as any,
      { get: jest.fn() } as any,
    );

    await service.uploadDocument(
      "c1",
      "u1",
      { originalname: "notes.txt", mimetype: "text/plain", buffer: Buffer.from("hello"), size: 5 } as any,
      undefined,
    );

    expect(storageBucket.upload).toHaveBeenCalled();
    expect(insertedRow).toEqual(expect.objectContaining({ company_id: "c1", uploaded_by: "u1", file_type: "txt" }));
    expect(processor.processDocument).not.toHaveBeenCalled();
  });

  it("uploadDocument removes file when insert fails", async () => {
    const storageBucket = { upload: jest.fn().mockResolvedValue({ error: null }), remove: jest.fn().mockResolvedValue({ error: null }) };
    const insertQuery = createQuery({ data: null, error: { message: "fail" } });

    const admin = {
      storage: { from: jest.fn(() => storageBucket) },
      schema: jest.fn(() => ({
        from: jest.fn(() => insertQuery),
      })),
    };

    const service = new KbService(
      { getAdminClient: jest.fn(() => admin as any) } as any,
      { processDocument: jest.fn() } as any,
      { get: jest.fn() } as any,
    );

    await expect(
      service.uploadDocument(
        "c1",
        "u1",
        { originalname: "notes.txt", mimetype: "text/plain", buffer: Buffer.from("hello"), size: 5 } as any,
        undefined,
      ),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(storageBucket.remove).toHaveBeenCalled();
  });

  it("deleteDocument throws when document is missing", async () => {
    const fetchQuery = createQuery({ data: null, error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => fetchQuery) })), storage: { from: jest.fn() } };
    const service = new KbService({ getAdminClient: jest.fn(() => admin as any) } as any, {} as any, { get: jest.fn() } as any);

    await expect(service.deleteDocument("c1", "doc1")).rejects.toBeInstanceOf(ValidationError);
  });

  it("listChunks uses range and returns data", async () => {
    const q = createThenableQuery({ data: [{ id: "ch1" }], error: null });
    const admin = { schema: jest.fn(() => ({ from: jest.fn(() => q) })) };
    const service = new KbService({ getAdminClient: jest.fn(() => admin as any) } as any, {} as any, { get: jest.fn() } as any);

    const res = await service.listChunks("c1", "doc1", 10, 20);
    expect(q.range).toHaveBeenCalledWith(20, 29);
    expect(res).toEqual([{ id: "ch1" }]);
  });

  it("deleteDocument deletes chunks, storage file, and document record", async () => {
    const fetchQuery = createQuery({ data: { id: "doc1", file_path: "c1/doc1/notes.txt" }, error: null });
    const deleteChunksQuery = createThenableQuery({ data: null, error: null });
    const deleteDocQuery = createThenableQuery({ data: null, error: null });

    const storageBucket = { remove: jest.fn().mockResolvedValue({ error: null }) };

    const from = jest
      .fn()
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(deleteChunksQuery)
      .mockReturnValueOnce(deleteDocQuery);

    const admin = {
      storage: { from: jest.fn(() => storageBucket) },
      schema: jest.fn(() => ({ from })),
    };

    const service = new KbService({ getAdminClient: jest.fn(() => admin as any) } as any, {} as any, { get: jest.fn() } as any);

    await service.deleteDocument("c1", "doc1");
    expect(storageBucket.remove).toHaveBeenCalledWith(["c1/doc1/notes.txt"]);
  });
});
