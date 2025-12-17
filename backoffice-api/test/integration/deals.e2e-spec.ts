import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession, getSupabaseClients } from "../utils/supabase";
import { pgQuery, quoteIdent } from "../utils/postgres";
import { createTestApp } from "../utils/test-app";

describe("Deals (integration)", () => {
  let app: INestApplication;
  let token: string;
  let companyId: string;
  let schemaName: string;
  let centurionId: string;
  let leadId: string;
  let dealId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    token = session.accessToken;

    const company = await request(app.getHttpServer())
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Deals Co" })
      .expect(201);
    companyId = company.body.id;
    schemaName = company.body.schema_name;

    const centurion = await request(app.getHttpServer())
      .post("/centurions")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ name: "SDR", slug: "sdr_deals", prompt: "Você é um SDR." })
      .expect(201);
    centurionId = centurion.body.id;

    const { admin } = getSupabaseClients();

    const lead = await admin
      .schema("core")
      .from("leads")
      .insert({ company_id: companyId, phone: "+15550000002", name: "Deal Lead" })
      .select("id")
      .single();
    if (lead.error || !lead.data?.id) throw new Error(`Failed to insert lead: ${lead.error?.message ?? "unknown"}`);
    leadId = String(lead.data.id);

    const inserted = await pgQuery<{ id: string }>(
      `insert into ${quoteIdent(schemaName)}.deals (company_id, core_lead_id, deal_full_name, deal_phone, deal_email, deal_status)
       values ($1,$2,$3,$4,$5,$6)
       returning id`,
      [companyId, leadId, "Deal Lead", "+15550000002", "deal.lead@example.com", "negocio_novo"],
    );
    dealId = String(inserted[0]?.id ?? "");
    if (!dealId) throw new Error("Failed to insert tenant deal");

    const idx = await admin
      .schema("core")
      .from("deals_index")
      .select("id")
      .eq("company_id", companyId)
      .eq("schema_name", schemaName)
      .eq("local_deal_id", dealId)
      .maybeSingle();
    if (idx.error || !idx.data?.id) throw new Error(`Failed to load deals_index: ${idx.error?.message ?? "missing"}`);

    const template = await admin
      .schema("core")
      .from("contract_templates")
      .insert({ company_id: companyId, name: "Template", variables: [] })
      .select("id")
      .single();
    if (template.error || !template.data?.id) throw new Error(`Failed to insert contract template: ${template.error?.message ?? "unknown"}`);

    await admin
      .schema("core")
      .from("contracts")
      .insert({ company_id: companyId, deal_index_id: idx.data.id, template_id: template.data.id, status: "draft" });

    const convo = await admin
      .schema("core")
      .from("conversations")
      .insert({ company_id: companyId, lead_id: leadId, centurion_id: centurionId, channel_type: "whatsapp" })
      .select("id")
      .single();
    if (convo.error || !convo.data?.id) throw new Error(`Failed to insert conversation: ${convo.error?.message ?? "unknown"}`);

    await admin
      .schema("core")
      .from("messages")
      .insert({ company_id: companyId, lead_id: leadId, conversation_id: convo.data.id, direction: "inbound", content_type: "text", content: "Oi" });
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /deals lists deals", async () => {
    const res = await request(app.getHttpServer())
      .get("/deals")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: dealId })]));
  });

  it("GET /deals/stats returns aggregated counts", async () => {
    const res = await request(app.getHttpServer())
      .get("/deals/stats")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({ company_id: companyId, total: expect.any(Number), by_status: expect.any(Object) }));
  });

  it("GET /deals/:id returns deal", async () => {
    const res = await request(app.getHttpServer())
      .get(`/deals/${dealId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({ id: dealId, core_lead_id: leadId }));
  });

  it("GET /deals/:id/timeline returns deal + messages + contracts", async () => {
    const res = await request(app.getHttpServer())
      .get(`/deals/${dealId}/timeline`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        deal: expect.objectContaining({ id: dealId }),
        lead_id: leadId,
        deal_index_id: expect.any(String),
        messages: expect.arrayContaining([expect.objectContaining({ content: "Oi" })]),
        contracts: expect.any(Array),
      }),
    );
  });
});
