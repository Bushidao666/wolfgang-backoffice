import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession } from "../utils/supabase";
import { createTestApp } from "../utils/test-app";

describe("Companies (integration)", () => {
  let app: INestApplication;
  let token: string;
  let companyId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    token = session.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects unauthenticated access", async () => {
    await request(app.getHttpServer()).get("/companies").expect(401);
  });

  it("POST /companies creates and provisions schema", async () => {
    const res = await request(app.getHttpServer())
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Acme LTDA" })
      .expect(201);

    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: "Acme LTDA",
        slug: expect.any(String),
        schema_name: expect.any(String),
        status: "active",
      }),
    );

    companyId = res.body.id;
  });

  it("GET /companies lists created company", async () => {
    const res = await request(app.getHttpServer())
      .get("/companies")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: companyId })]));
  });

  it("PATCH /companies/:id updates company", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/companies/${companyId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Acme Updated" })
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({ id: companyId, name: "Acme Updated" }));
  });
});

