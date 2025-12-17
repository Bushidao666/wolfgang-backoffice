import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { CompaniesService } from "./companies.service";

function createRepoMock(overrides: Partial<any> = {}) {
  return {
    listCompanies: jest.fn(),
    getPrimarySchemaName: jest.fn(),
    existsBySlug: jest.fn(),
    createCompany: jest.fn(),
    ensureDefaultCenturionConfig: jest.fn(),
    upsertCompanyCrm: jest.fn(),
    deleteCompany: jest.fn(),
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
    const provisioner = { provisionSchema: jest.fn() } as any;

    const service = new CompaniesService(repo as any, provisioner);
    const res = await service.list({ page: 2, per_page: 10 });

    expect(res.page).toBe(2);
    expect(res.per_page).toBe(10);
    expect(res.total).toBe(1);
    expect(res.data[0]).toMatchObject({ id: "c1", slug: "a", schema_name: "tenant_a" });
  });

  it("create generates slug and provisions schema", async () => {
    const repo = createRepoMock({
      existsBySlug: jest.fn().mockResolvedValue(false),
      createCompany: jest.fn().mockResolvedValue({
        id: "c1",
        name: "Empresa X",
        slug: "empresa_x",
        document: null,
        status: "active",
        settings: {},
        created_at: "t",
        updated_at: "t",
      }),
      ensureDefaultCenturionConfig: jest.fn().mockResolvedValue(undefined),
      upsertCompanyCrm: jest.fn().mockResolvedValue(undefined),
      deleteCompany: jest.fn().mockResolvedValue(undefined),
    });
    const provisioner = { provisionSchema: jest.fn().mockResolvedValue("tenant_empresa_x") } as any;

    const service = new CompaniesService(repo as any, provisioner);
    const res = await service.create({ name: "Empresa X" }, "owner");

    expect(res.slug).toBe("empresa_x");
    expect(res.schema_name).toBe("tenant_empresa_x");
    expect(repo.ensureDefaultCenturionConfig).toHaveBeenCalledWith("c1");
  });

  it("create appends suffix when slug already exists", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    const repo = createRepoMock({
      existsBySlug: jest.fn().mockImplementation(async (slug: string) => slug === "empresa_x"),
      createCompany: jest.fn().mockResolvedValue({
        id: "c1",
        name: "Empresa X",
        slug: "empresa_x_krd8m0",
        document: null,
        status: "active",
        settings: {},
        created_at: "t",
        updated_at: "t",
      }),
      ensureDefaultCenturionConfig: jest.fn().mockResolvedValue(undefined),
      upsertCompanyCrm: jest.fn().mockResolvedValue(undefined),
      deleteCompany: jest.fn().mockResolvedValue(undefined),
    });
    const provisioner = { provisionSchema: jest.fn().mockResolvedValue("tenant_empresa_x") } as any;

    const service = new CompaniesService(repo as any, provisioner);
    const res = await service.create({ name: "Empresa X" }, "owner");

    expect(res.slug).toMatch(/^empresa_x_/);
    expect(repo.existsBySlug).toHaveBeenCalled();
  });

  it("create rolls back company when provisioning fails", async () => {
    const repo = createRepoMock({
      existsBySlug: jest.fn().mockResolvedValue(false),
      createCompany: jest.fn().mockResolvedValue({
        id: "c1",
        name: "Empresa X",
        slug: "empresa_x",
        document: null,
        status: "active",
        settings: {},
        created_at: "t",
        updated_at: "t",
      }),
      ensureDefaultCenturionConfig: jest.fn().mockResolvedValue(undefined),
      deleteCompany: jest.fn().mockResolvedValue(undefined),
    });
    const provisioner = { provisionSchema: jest.fn().mockRejectedValue(new ValidationError("fail")) } as any;

    const service = new CompaniesService(repo as any, provisioner);
    await expect(service.create({ name: "Empresa X" }, "owner")).rejects.toBeInstanceOf(ValidationError);
    expect(repo.deleteCompany).toHaveBeenCalledWith("c1");
  });

  it("getById throws NotFoundError when missing", async () => {
    const repo = createRepoMock({ getCompanyById: jest.fn().mockResolvedValue(null) });
    const provisioner = { provisionSchema: jest.fn() } as any;
    const service = new CompaniesService(repo as any, provisioner);
    await expect(service.getById("c1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update throws NotFoundError when missing", async () => {
    const repo = createRepoMock({ getCompanyById: jest.fn().mockResolvedValue(null) });
    const provisioner = { provisionSchema: jest.fn() } as any;
    const service = new CompaniesService(repo as any, provisioner);
    await expect(service.update("c1", { name: "X" })).rejects.toBeInstanceOf(NotFoundError);
  });
});

