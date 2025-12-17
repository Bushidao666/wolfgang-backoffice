import { UnauthorizedException } from "@nestjs/common";

import { ValidationError } from "@wolfgang/contracts";

import { AuthService } from "./auth.service";

function createSupabaseMock() {
  const signInWithPassword = jest.fn();
  const refreshSession = jest.fn();
  const resetPasswordForEmail = jest.fn();

  const anonClient = {
    auth: {
      signInWithPassword,
      refreshSession,
      resetPasswordForEmail,
    },
  };

  const signOut = jest.fn();
  const updateUser = jest.fn();

  const userClient = {
    auth: {
      signOut,
      updateUser,
    },
  };

  const supabase = {
    getAnonClient: jest.fn(() => anonClient as any),
    getUserClient: jest.fn(() => userClient as any),
  } as any;

  return { supabase, signInWithPassword, refreshSession, resetPasswordForEmail, signOut, updateUser };
}

describe("AuthService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.CORS_ORIGIN;
  });

  it("login returns tokens when session exists", async () => {
    const { supabase, signInWithPassword } = createSupabaseMock();
    signInWithPassword.mockResolvedValue({
      data: { session: { access_token: "a", refresh_token: "r", expires_in: 3600, token_type: "bearer" }, user: { id: "u" } },
      error: null,
    });

    const service = new AuthService(supabase);
    const result = await service.login({ email: "a@b.com", password: "x" });

    expect(result.access_token).toBe("a");
    expect(result.refresh_token).toBe("r");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "x" });
  });

  it("login throws when credentials invalid", async () => {
    const { supabase, signInWithPassword } = createSupabaseMock();
    signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: "invalid" } });

    const service = new AuthService(supabase);
    await expect(service.login({ email: "a@b.com", password: "x" })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("refresh returns tokens when session exists", async () => {
    const { supabase, refreshSession } = createSupabaseMock();
    refreshSession.mockResolvedValue({
      data: { session: { access_token: "a2", refresh_token: "r2", expires_in: 3600, token_type: "bearer" }, user: { id: "u2" } },
      error: null,
    });

    const service = new AuthService(supabase);
    const result = await service.refresh("refresh-token");

    expect(result.access_token).toBe("a2");
    expect(refreshSession).toHaveBeenCalledWith({ refresh_token: "refresh-token" });
  });

  it("forgotPassword uses first CORS origin and returns ok", async () => {
    process.env.CORS_ORIGIN = "http://example.com, http://localhost:3000";
    const { supabase, resetPasswordForEmail } = createSupabaseMock();
    resetPasswordForEmail.mockResolvedValue({ error: null });

    const service = new AuthService(supabase);
    await expect(service.forgotPassword("user@example.com")).resolves.toEqual({ ok: true });

    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", { redirectTo: "http://example.com/reset-password" });
  });

  it("forgotPassword throws ValidationError on failure", async () => {
    const { supabase, resetPasswordForEmail } = createSupabaseMock();
    resetPasswordForEmail.mockResolvedValue({ error: { message: "fail" } });

    const service = new AuthService(supabase);
    await expect(service.forgotPassword("user@example.com")).rejects.toBeInstanceOf(ValidationError);
  });

  it("resetPassword returns ok when update succeeds", async () => {
    const { supabase, updateUser } = createSupabaseMock();
    updateUser.mockResolvedValue({ data: { user: { id: "u" } }, error: null });

    const service = new AuthService(supabase);
    await expect(service.resetPassword("token", "newpass")).resolves.toEqual({ ok: true, user: { id: "u" } });
    expect(updateUser).toHaveBeenCalledWith({ password: "newpass" });
  });

  it("resetPassword throws UnauthorizedException when token invalid", async () => {
    const { supabase, updateUser } = createSupabaseMock();
    updateUser.mockResolvedValue({ data: null, error: { message: "expired" } });

    const service = new AuthService(supabase);
    await expect(service.resetPassword("token", "newpass")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("logout ignores signOut errors and returns ok", async () => {
    const { supabase, signOut } = createSupabaseMock();
    signOut.mockRejectedValue(new Error("network"));

    const service = new AuthService(supabase);
    await expect(service.logout("token")).resolves.toEqual({ ok: true });
    expect(supabase.getUserClient).toHaveBeenCalledWith("token");
  });
});

