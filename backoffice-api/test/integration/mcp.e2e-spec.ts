import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession } from "../utils/supabase";
import { createTestApp } from "../utils/test-app";

describe("MCP (integration)", () => {
  let app: INestApplication;
  let token: string;
  let companyId: string;
  let centurionId: string;
  let serverId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    token = session.accessToken;

    const company = await request(app.getHttpServer())
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "MCP Co" })
      .expect(201);
    companyId = company.body.id;

    const centurion = await request(app.getHttpServer())
      .post("/centurions")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ name: "SDR", slug: "sdr_mcp", prompt: "Você é um SDR." })
      .expect(201);
    centurionId = centurion.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /centurions/:id/mcp-servers creates server", async () => {
    const res = await request(app.getHttpServer())
      .post(`/centurions/${centurionId}/mcp-servers`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ name: "Local MCP", server_url: "http://localhost:9000" })
      .expect(201);

    serverId = res.body.id;
    expect(res.body).toEqual(expect.objectContaining({ id: expect.any(String), server_url: "http://localhost:9000" }));
  });

  it("GET /centurions/:id/mcp-servers lists servers", async () => {
    const res = await request(app.getHttpServer())
      .get(`/centurions/${centurionId}/mcp-servers`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: serverId })]));
  });

  it("DELETE /centurions/:id/mcp-servers/:serverId deletes server", async () => {
    await request(app.getHttpServer())
      .delete(`/centurions/${centurionId}/mcp-servers/${serverId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
  });
});

