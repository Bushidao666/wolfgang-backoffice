import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession, getSupabaseClients } from "../utils/supabase";
import { createTestApp } from "../utils/test-app";

describe("Pixels (integration)", () => {
  let app: INestApplication;
  let token: string;
  let companyId: string;
  let pixelConfigId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    token = session.accessToken;

    const company = await request(app.getHttpServer())
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Pixels Co" })
      .expect(201);
    companyId = company.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates, lists, updates, and deletes pixels", async () => {
    const created = await request(app.getHttpServer())
      .post("/pixels")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ pixel_id: "123456789", meta_access_token: "token", meta_test_event_code: "TEST" })
      .expect(201);

    pixelConfigId = created.body.id;
    expect(created.body).toEqual(expect.objectContaining({ id: expect.any(String), pixel_id: "123456789", has_access_token: true }));

    const listed = await request(app.getHttpServer())
      .get("/pixels")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
    expect(listed.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: pixelConfigId })]));

    const updated = await request(app.getHttpServer())
      .patch(`/pixels/${pixelConfigId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ is_active: false })
      .expect(200);
    expect(updated.body).toEqual(expect.objectContaining({ id: pixelConfigId, is_active: false }));

    const { admin } = getSupabaseClients();
    await admin
      .schema("core")
      .from("capi_event_logs")
      .insert({
        company_id: companyId,
        pixel_id: "123456789",
        event_name: "Lead",
        event_time: new Date().toISOString(),
        event_payload: { ok: true },
        status: "pending",
      });

    const events = await request(app.getHttpServer())
      .get(`/pixels/${pixelConfigId}/events`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
    expect(events.body).toEqual(expect.arrayContaining([expect.objectContaining({ event_name: "Lead" })]));

    await request(app.getHttpServer())
      .delete(`/pixels/${pixelConfigId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
  });
});

