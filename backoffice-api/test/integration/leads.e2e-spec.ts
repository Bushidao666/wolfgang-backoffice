import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession, getSupabaseClients } from "../utils/supabase";
import { createTestApp } from "../utils/test-app";

describe("Leads (integration)", () => {
  let app: INestApplication;
  let token: string;
  let companyId: string;
  let centurionId: string;
  let leadId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    token = session.accessToken;

    const company = await request(app.getHttpServer())
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Leads Co" })
      .expect(201);
    companyId = company.body.id;

    const centurion = await request(app.getHttpServer())
      .post("/centurions")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ name: "SDR", slug: "sdr_leads", prompt: "Você é um SDR." })
      .expect(201);
    centurionId = centurion.body.id;

    const { admin } = getSupabaseClients();

    const leadInsert = await admin
      .schema("core")
      .from("leads")
      .insert({ company_id: companyId, phone: "+15550000001", name: "John" })
      .select("id")
      .single();
    if (leadInsert.error || !leadInsert.data?.id) {
      throw new Error(`Failed to insert lead: ${leadInsert.error?.message ?? "unknown"}`);
    }
    leadId = String(leadInsert.data.id);

    const convo = await admin
      .schema("core")
      .from("conversations")
      .insert({ company_id: companyId, lead_id: leadId, centurion_id: centurionId, channel_type: "whatsapp" })
      .select("id")
      .single();
    if (convo.error || !convo.data?.id) {
      throw new Error(`Failed to insert conversation: ${convo.error?.message ?? "unknown"}`);
    }

    const message = await admin
      .schema("core")
      .from("messages")
      .insert({
        company_id: companyId,
        lead_id: leadId,
        conversation_id: convo.data.id,
        direction: "inbound",
        content_type: "text",
        content: "Olá!",
      })
      .select("id")
      .single();
    if (message.error) {
      throw new Error(`Failed to insert message: ${message.error.message}`);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /leads lists leads for company", async () => {
    const res = await request(app.getHttpServer())
      .get("/leads")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    expect(res.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: leadId })]));
  });

  it("GET /leads/:id returns lead", async () => {
    const res = await request(app.getHttpServer())
      .get(`/leads/${leadId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({ id: leadId, name: "John" }));
  });

  it("GET /leads/:id/timeline returns messages", async () => {
    const res = await request(app.getHttpServer())
      .get(`/leads/${leadId}/timeline?limit=50&offset=0`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        lead_id: leadId,
        messages: expect.arrayContaining([expect.objectContaining({ content: "Olá!" })]),
      }),
    );
  });
});

