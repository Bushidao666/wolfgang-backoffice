import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession } from "../utils/supabase";
import { createTestApp } from "../utils/test-app";

describe("Auth (integration)", () => {
  let app: INestApplication;
  let email: string;
  let password: string;

  beforeAll(async () => {
    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    email = session.email;
    password = session.password;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /auth/login authenticates via Supabase", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password })
      .expect(201);

    expect(res.body).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        token_type: expect.any(String),
        expires_in: expect.any(Number),
        user: expect.any(Object),
      }),
    );
  });

  it("GET /auth/me returns mapped JWT claims", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password })
      .expect(201);

    const token = login.body.access_token as string;

    const res = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        sub: expect.any(String),
        role: "backoffice_admin",
      }),
    );
  });
});

