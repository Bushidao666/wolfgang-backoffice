import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession } from "../utils/supabase";
import { createTestApp } from "../utils/test-app";

describe("Centurions (integration)", () => {
  let app: INestApplication;
  let token: string;
  let companyId: string;
  let centurionId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    token = session.accessToken;

    const company = await request(app.getHttpServer())
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Centurion Co" })
      .expect(201);
    companyId = company.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /centurions creates centurion config", async () => {
    const res = await request(app.getHttpServer())
      .post("/centurions")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ name: "SDR", slug: "sdr_principal", prompt: "Você é um SDR." })
      .expect(201);

    centurionId = res.body.id;
    expect(res.body).toEqual(expect.objectContaining({ id: expect.any(String), company_id: companyId, slug: "sdr_principal" }));
  });

  it("GET /centurions lists centurions", async () => {
    const res = await request(app.getHttpServer())
      .get("/centurions")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: centurionId })]));
  });

  it("PATCH /centurions/:id updates centurion", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/centurions/${centurionId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ name: "SDR Updated", is_active: false })
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({ id: centurionId, name: "SDR Updated", is_active: false }));
  });

  it("DELETE /centurions/:id deletes centurion", async () => {
    await request(app.getHttpServer())
      .delete(`/centurions/${centurionId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
  });
});

