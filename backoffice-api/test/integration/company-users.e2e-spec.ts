import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession, getSupabaseClients } from "../utils/supabase";
import { createTestApp } from "../utils/test-app";

describe("Company Users (integration)", () => {
  let app: INestApplication;
  let token: string;
  let companyId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    token = session.accessToken;

    const company = await request(app.getHttpServer())
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Users Co" })
      .expect(201);
    companyId = company.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects unauthenticated access", async () => {
    await request(app.getHttpServer()).get(`/companies/${companyId}/users`).expect(401);
  });

  it("adds, lists and removes a company user", async () => {
    const { admin } = getSupabaseClients();
    const email = `user_${Date.now()}@example.com`;
    const password = "P@ssw0rd!12345";

    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user?.id) {
      throw new Error(`Failed to create auth user: ${created.error?.message ?? "unknown"}`);
    }
    const userId = created.data.user.id;

    const added = await request(app.getHttpServer())
      .post(`/companies/${companyId}/users`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email, role: "viewer", scopes: ["leads:read"] })
      .expect(201);

    expect(added.body).toEqual(
      expect.objectContaining({
        company_id: companyId,
        user_id: userId,
        role: "viewer",
        scopes: ["leads:read"],
        email,
      }),
    );

    const listed = await request(app.getHttpServer())
      .get(`/companies/${companyId}/users`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(listed.body).toEqual(
      expect.objectContaining({
        company_id: companyId,
        users: expect.arrayContaining([expect.objectContaining({ user_id: userId, email })]),
      }),
    );

    await request(app.getHttpServer())
      .delete(`/companies/${companyId}/users/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const listedAfter = await request(app.getHttpServer())
      .get(`/companies/${companyId}/users`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(listedAfter.body.users).toEqual(expect.not.arrayContaining([expect.objectContaining({ user_id: userId })]));
  });
});

