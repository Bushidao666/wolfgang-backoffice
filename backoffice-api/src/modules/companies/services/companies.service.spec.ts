import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { CompaniesService } from "./companies.service";

function createRepoMock(overrides: Partial<any> = {}) {
  return {
    listCompanies: jest.fn(),
    getPrimarySchemaName: jest.fn(),
    existsBySlug: jest.fn(),
    createCompanyFull: jest.fn(),
    getCompanyById: jest.fn(),
    updateCompany: jest.fn(),
    archiveCompany: jest.fn(),
    ...overrides,
  };
}

describe("CompaniesService", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("list returns companies with resolved schema_name", async () => {
    const repo = createRepoMock({
      listCompanies: jest.fn().mockResolvedValue({
        rows: [
          { id: "c1", name: "A", slug: "a", document: null, status: "active", settings: {}, created_at: "t", updated_at: "t" },
        ],
        total: 1,
      }),
      getPrimarySchemaName: jest.fn().mockResolvedValue("tenant_a"),
    });
    const service = new CompaniesService(repo as any);
    const res = await service.list({ page: 2, per_page: 10 });

    expect(res.page).toBe(2);
    expect(res.per_page).toBe(10);
    expect(res.total).toBe(1);
    expect(res.data[0]).toMatchObject({ id: "c1", slug: "a", schema_name: "tenant_a" });
  });

  it("create generates slug and provisions schema", async () => {
    const repo = createRepoMock({
      existsBySlug: jest.fn().mockResolvedValue(false),
      createCompanyFull: jest.fn().mockResolvedValue({
        company: {
          id: "c1",
          name: "Empresa X",
          slug: "empresa_x",
          document: null,
          status: "active",
          settings: {},
          created_at: "t",
          updated_at: "t",
        },
        schema_name: "tenant_empresa_x",
      }),
    });
    const service = new CompaniesService(repo as any);
    const res = await service.create({ name: "Empresa X" }, "owner");

    expect(res.slug).toBe("empresa_x");
    expect(res.schema_name).toBe("tenant_empresa_x");
    expect(repo.createCompanyFull).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Empresa X", slug: "empresa_x", owner_user_id: "owner" }),
    );
  });

  it("create appends suffix when slug already exists", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    const repo = createRepoMock({
      createCompanyFull: jest
        .fn()
        .mockRejectedValueOnce(new ValidationError("duplicate"))
        .mockResolvedValueOnce({
          company: {
            id: "c1",
            name: "Empresa X",
            slug: "empresa_x_krd8m0",
            document: null,
            status: "active",
            settings: {},
            created_at: "t",
            updated_at: "t",
          },
          schema_name: "tenant_empresa_x_krd8m0",
        }),
    });
    const service = new CompaniesService(repo as any);
    const res = await service.create({ name: "Empresa X" }, "owner");

    expect(res.slug).toMatch(/^empresa_x_/);
    expect(repo.createCompanyFull).toHaveBeenCalledTimes(2);
  });

  it("create fails when provisioning fails", async () => {
    const repo = createRepoMock({
      existsBySlug: jest.fn().mockResolvedValue(false),
      createCompanyFull: jest.fn().mockRejectedValue(new ValidationError("fail")),
    });
    const service = new CompaniesService(repo as any);
    await expect(service.create({ name: "Empresa X" }, "owner")).rejects.toBeInstanceOf(ValidationError);
  });

  it("getById throws NotFoundError when missing", async () => {
    const repo = createRepoMock({ getCompanyById: jest.fn().mockResolvedValue(null) });
    const service = new CompaniesService(repo as any);
    await expect(service.getById("c1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update throws NotFoundError when missing", async () => {
    const repo = createRepoMock({ getCompanyById: jest.fn().mockResolvedValue(null) });
    const service = new CompaniesService(repo as any);
    await expect(service.update("c1", { name: "X" })).rejects.toBeInstanceOf(NotFoundError);
  });
});
