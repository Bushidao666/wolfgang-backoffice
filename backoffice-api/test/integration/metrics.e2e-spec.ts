import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession, getSupabaseClients } from "../utils/supabase";
import { createTestApp } from "../utils/test-app";

describe("Metrics (integration)", () => {
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
      .send({ name: "Metrics Co" })
      .expect(201);
    companyId = company.body.id;

    const { admin } = getSupabaseClients();
    const template = await admin
      .schema("core")
      .from("contract_templates")
      .insert({ company_id: companyId, name: "Template", variables: [] })
      .select("id")
      .single();
    if (template.error || !template.data?.id) throw new Error(`Failed to insert contract template: ${template.error?.message ?? "unknown"}`);

    const lead1 = await admin.schema("core").from("leads").insert({ company_id: companyId, phone: "+15550000003", lifecycle_stage: "new" }).select("id").single();
    const lead2 = await admin
      .schema("core")
      .from("leads")
      .insert({ company_id: companyId, phone: "+15550000004", lifecycle_stage: "qualified", is_qualified: true, qualified_at: new Date().toISOString() })
      .select("id")
      .single();
    if (lead1.error || lead2.error) throw new Error("Failed to insert leads");

    await admin
      .schema("core")
      .from("contracts")
      .insert({ company_id: companyId, template_id: template.data.id, status: "signed", signed_at: new Date().toISOString() });
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /metrics/summary returns summary", async () => {
    const res = await request(app.getHttpServer())
      .get("/metrics/summary")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({ company_id: companyId, total_leads: expect.any(Number) }));
  });

  it("GET /metrics/timeline returns timeline points", async () => {
    const res = await request(app.getHttpServer())
      .get("/metrics/timeline")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({ company_id: companyId, points: expect.any(Array) }));
  });
});

