import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession } from "../utils/supabase";
import { createTestApp } from "../utils/test-app";

describe("Follow-ups (integration)", () => {
  let app: INestApplication;
  let token: string;
  let companyId: string;
  let centurionId: string;
  let ruleId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    token = session.accessToken;

    const company = await request(app.getHttpServer())
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Followups Co" })
      .expect(201);
    companyId = company.body.id;

    const centurion = await request(app.getHttpServer())
      .post("/centurions")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ name: "SDR", slug: "sdr_followups", prompt: "Você é um SDR." })
      .expect(201);
    centurionId = centurion.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates, updates, and deletes follow-up rules", async () => {
    const created = await request(app.getHttpServer())
      .post(`/centurions/${centurionId}/followup-rules`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ name: "Rule 1", template: "Olá!", inactivity_hours: 12, max_attempts: 2 })
      .expect(201);
    ruleId = created.body.id;

    const listed = await request(app.getHttpServer())
      .get(`/centurions/${centurionId}/followup-rules`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
    expect(listed.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: ruleId })]));

    const updated = await request(app.getHttpServer())
      .put(`/centurions/${centurionId}/followup-rules/${ruleId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ name: "Rule 1", template: "Ping", inactivity_hours: 24, max_attempts: 1, is_active: false })
      .expect(200);
    expect(updated.body).toEqual(expect.objectContaining({ id: ruleId, is_active: false }));

    await request(app.getHttpServer())
      .delete(`/centurions/${centurionId}/followup-rules/${ruleId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
  });
});

