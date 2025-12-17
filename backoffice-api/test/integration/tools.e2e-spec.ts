import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession, getSupabaseClients } from "../utils/supabase";
import { createTestApp } from "../utils/test-app";

describe("Tools (integration)", () => {
  let app: INestApplication;
  let token: string;
  let companyId: string;
  let centurionId: string;
  let toolId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    token = session.accessToken;

    const company = await request(app.getHttpServer())
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Tools Co" })
      .expect(201);
    companyId = company.body.id;

    const centurion = await request(app.getHttpServer())
      .post("/centurions")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ name: "SDR", slug: "sdr_tools", prompt: "Você é um SDR." })
      .expect(201);
    centurionId = centurion.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /centurions/:id/tools creates tool config", async () => {
    const res = await request(app.getHttpServer())
      .post(`/centurions/${centurionId}/tools`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({
        tool_name: "search",
        endpoint: "http://example.com",
        input_schema: { type: "object", properties: { q: { type: "string" } }, required: ["q"] },
      })
      .expect(201);

    toolId = res.body.id;
    expect(res.body).toEqual(expect.objectContaining({ id: expect.any(String), tool_name: "search" }));
  });

  it("GET /centurions/:id/tools lists tools", async () => {
    const res = await request(app.getHttpServer())
      .get(`/centurions/${centurionId}/tools`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: toolId })]));
  });

  it("PATCH /centurions/:id/tools/:toolId updates tool config", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/centurions/${centurionId}/tools/${toolId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ description: "Search tool", is_active: false })
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({ id: toolId, description: "Search tool", is_active: false }));
  });

  it("DELETE /centurions/:id/tools/:toolId deletes tool config", async () => {
    await request(app.getHttpServer())
      .delete(`/centurions/${centurionId}/tools/${toolId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    const { admin } = getSupabaseClients();
    const { data } = await admin.schema("core").from("tool_configs").select("id").eq("id", toolId).maybeSingle();
    expect(data).toBeNull();
  });
});

