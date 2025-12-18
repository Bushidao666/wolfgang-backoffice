import { ValidationError } from "@wolfgang/contracts";

import { DocumentProcessorService } from "./document-processor.service";

function createUpdateMaybeSingleQuery(result: any) {
  const q: any = {
    update: jest.fn(() => q),
    eq: jest.fn(() => q),
    select: jest.fn(() => q),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  return q;
}

function createThenableMutation(result: any) {
  const q: any = {
    update: jest.fn(() => q),
    insert: jest.fn(() => q),
    delete: jest.fn(() => q),
    eq: jest.fn(() => q),
  };
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return q;
}

describe("DocumentProcessorService", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_BASE_URL = "http://openai.test/v1";
    process.env.OPENAI_EMBEDDING_MODEL = "test-model";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_EMBEDDING_MODEL;
    delete process.env.KB_CHUNK_WORDS;
    delete process.env.KB_CHUNK_OVERLAP;
  });

  it("processDocument marks error when no text can be extracted", async () => {
    const docId = "doc1";
    const claim = createUpdateMaybeSingleQuery({
      data: {
        id: docId,
        company_id: "c1",
        title: "Doc",
        file_path: "c1/doc1/file.bin",
        file_type: "bin",
        status: "uploaded",
        metadata: {},
      },
      error: null,
    });

    const markError = createThenableMutation({ data: null, error: null });

    const bucket = {
      download: jest.fn().mockResolvedValue({ data: new Blob([Buffer.from("nope")]), error: null }),
    };

    const from = jest.fn().mockReturnValueOnce(claim).mockReturnValueOnce(markError);
    const admin = {
      schema: jest.fn(() => ({ from })),
      storage: { from: jest.fn(() => bucket) },
    };

    const service = new DocumentProcessorService(
      { getAdminClient: jest.fn(() => admin as any) } as any,
      { get: jest.fn() } as any,
      { resolve: jest.fn().mockResolvedValue(null) } as any,
    );

    await service.processDocument(docId);

    expect(markError.update).toHaveBeenCalledWith(expect.objectContaining({ status: "error" }));
  });

  it("processDocument processes text file end-to-end", async () => {
    process.env.KB_CHUNK_WORDS = "10";
    process.env.KB_CHUNK_OVERLAP = "0";

    const docId = "doc2";
    const claimedRow = {
      id: docId,
      company_id: "c1",
      title: "Doc",
      file_path: "c1/doc2/file.txt",
      file_type: "txt",
      status: "uploaded",
      metadata: {},
    };

    const claim = createUpdateMaybeSingleQuery({ data: claimedRow, error: null });
    const deleteChunks = createThenableMutation({ data: null, error: null });
    const insertChunks = createThenableMutation({ data: null, error: null });
    const updateReady = createThenableMutation({ data: null, error: null });

    const bucket = {
      download: jest.fn().mockResolvedValue({ data: new Blob([Buffer.from("hello world from kb")]), error: null }),
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
    } as any);

    const from = jest
      .fn()
      .mockReturnValueOnce(claim)
      .mockReturnValueOnce(deleteChunks)
      .mockReturnValueOnce(insertChunks)
      .mockReturnValueOnce(updateReady);

    const admin = {
      schema: jest.fn(() => ({ from })),
      storage: { from: jest.fn(() => bucket) },
    };

    const service = new DocumentProcessorService(
      { getAdminClient: jest.fn(() => admin as any) } as any,
      { get: jest.fn() } as any,
      { resolve: jest.fn().mockResolvedValue(null) } as any,
    );

    await service.processDocument(docId);

    expect(bucket.download).toHaveBeenCalledWith("c1/doc2/file.txt");
    expect(deleteChunks.delete).toHaveBeenCalled();
    expect(insertChunks.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ document_id: docId, company_id: "c1", chunk_index: 0 })]),
    );
    expect(updateReady.update).toHaveBeenCalledWith(expect.objectContaining({ status: "ready" }));
  });

  it("embedChunks requires OPENAI_API_KEY", async () => {
    delete process.env.OPENAI_API_KEY;
    const service = new DocumentProcessorService(
      { getAdminClient: jest.fn() } as any,
      { get: jest.fn() } as any,
      { resolve: jest.fn().mockResolvedValue(null) } as any,
    );

    await expect((service as any)._embedChunks("c1", ["a"])).rejects.toBeInstanceOf(ValidationError);
  });
});
