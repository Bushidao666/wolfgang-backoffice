import { ValidationError } from "@wolfgang/contracts";

import { SchemaProvisionerService } from "./schema-provisioner.service";

describe("SchemaProvisionerService", () => {
  it("returns schema name from provision function", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: "tenant_schema", error: null });
    const supabase = {
      getAdminClient: jest.fn(() => ({ schema: jest.fn(() => ({ rpc })) })),
    } as any;

    const service = new SchemaProvisionerService(supabase);
    await expect(service.provisionSchema("acme")).resolves.toBe("tenant_schema");
    expect(rpc).toHaveBeenCalledWith("fn_provision_company_schema", { p_slug: "acme" });
  });

  it("throws ValidationError when rpc fails", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "fail" } });
    const supabase = {
      getAdminClient: jest.fn(() => ({ schema: jest.fn(() => ({ rpc })) })),
    } as any;

    const service = new SchemaProvisionerService(supabase);
    await expect(service.provisionSchema("acme")).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ValidationError when rpc returns no data", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    const supabase = {
      getAdminClient: jest.fn(() => ({ schema: jest.fn(() => ({ rpc })) })),
    } as any;

    const service = new SchemaProvisionerService(supabase);
    await expect(service.provisionSchema("acme")).rejects.toBeInstanceOf(ValidationError);
  });
});

