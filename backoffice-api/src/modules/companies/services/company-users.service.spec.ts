import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { CompanyUsersService } from "./company-users.service";

function createAdminAuthMock() {
  return {
    listUsers: jest.fn(),
    inviteUserByEmail: jest.fn(),
    getUserById: jest.fn(),
  };
}

describe("CompanyUsersService", () => {
  it("list throws NotFoundError when company missing", async () => {
    const repo = { getCompanyById: jest.fn().mockResolvedValue(null) } as any;
    const supabase = { getAdminClient: jest.fn() } as any;
    const service = new CompanyUsersService(repo, supabase);
    await expect(service.list("c1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("list returns emails when available", async () => {
    const repo = {
      getCompanyById: jest.fn().mockResolvedValue({ id: "c1" }),
      listCompanyUsers: jest.fn().mockResolvedValue([
        { user_id: "u1", role: "viewer", scopes: [] },
        { user_id: "u2", role: "admin", scopes: ["x"] },
      ]),
    } as any;

    const authAdmin = createAdminAuthMock();
    authAdmin.getUserById.mockImplementation(async (id: string) => {
      if (id === "u1") return { data: { user: { email: "u1@example.com" } }, error: null };
      return { data: null, error: { message: "not found" } };
    });

    const adminClient = { auth: { admin: authAdmin } };
    const supabase = { getAdminClient: jest.fn(() => adminClient as any) } as any;

    const service = new CompanyUsersService(repo, supabase);
    const res = await service.list("c1");

    expect(res.company_id).toBe("c1");
    expect(res.users).toEqual([
      { user_id: "u1", role: "viewer", scopes: [], email: "u1@example.com" },
      { user_id: "u2", role: "admin", scopes: ["x"], email: null },
    ]);
  });

  it("add finds existing user by email and links", async () => {
    const repo = {
      getCompanyById: jest.fn().mockResolvedValue({ id: "c1" }),
      addCompanyUser: jest.fn().mockResolvedValue({ id: "link1", company_id: "c1", user_id: "u1", role: "viewer", scopes: [] }),
    } as any;

    const authAdmin = createAdminAuthMock();
    authAdmin.listUsers.mockResolvedValue({
      data: { users: [{ id: "u1", email: "user@example.com" }] },
      error: null,
    });
    authAdmin.getUserById.mockResolvedValue({ data: { user: { email: "user@example.com" } }, error: null });

    const adminClient = { auth: { admin: authAdmin } };
    const supabase = { getAdminClient: jest.fn(() => adminClient as any) } as any;

    const service = new CompanyUsersService(repo, supabase);
    const res = await service.add("c1", { email: "User@Example.com" });

    expect(repo.addCompanyUser).toHaveBeenCalledWith({ companyId: "c1", userId: "u1", role: "viewer", scopes: [] });
    expect(res).toMatchObject({ id: "link1", user_id: "u1", email: "user@example.com" });
  });

  it("add invites user when not found", async () => {
    const repo = {
      getCompanyById: jest.fn().mockResolvedValue({ id: "c1" }),
      addCompanyUser: jest.fn().mockResolvedValue({ id: "link1", company_id: "c1", user_id: "u2", role: "admin", scopes: ["s"] }),
    } as any;

    const authAdmin = createAdminAuthMock();
    authAdmin.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
    authAdmin.inviteUserByEmail.mockResolvedValue({ data: { user: { id: "u2" } }, error: null });
    authAdmin.getUserById.mockResolvedValue({ data: { user: { email: "invited@example.com" } }, error: null });

    const adminClient = { auth: { admin: authAdmin } };
    const supabase = { getAdminClient: jest.fn(() => adminClient as any) } as any;

    const service = new CompanyUsersService(repo, supabase);
    const res = await service.add("c1", { email: "invited@example.com", role: "admin", scopes: ["s"] });

    expect(authAdmin.inviteUserByEmail).toHaveBeenCalledWith("invited@example.com");
    expect(res).toMatchObject({ user_id: "u2", role: "admin", scopes: ["s"] });
  });

  it("add throws ValidationError when listUsers fails", async () => {
    const repo = { getCompanyById: jest.fn().mockResolvedValue({ id: "c1" }) } as any;
    const authAdmin = createAdminAuthMock();
    authAdmin.listUsers.mockResolvedValue({ data: null, error: { message: "fail" } });
    const adminClient = { auth: { admin: authAdmin } };
    const supabase = { getAdminClient: jest.fn(() => adminClient as any) } as any;

    const service = new CompanyUsersService(repo, supabase);
    await expect(service.add("c1", { email: "x@example.com" })).rejects.toBeInstanceOf(ValidationError);
  });
});

