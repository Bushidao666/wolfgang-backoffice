import http from "http";

import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession, getSupabaseClients } from "../utils/supabase";
import { pgQuery, quoteIdent } from "../utils/postgres";
import { createTestApp } from "../utils/test-app";

function startAutentiqueStub() {
  const calls: Array<{ headers: http.IncomingHttpHeaders; body: any }> = [];

  const server = http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/contracts") {
      res.statusCode = 404;
      res.end();
      return;
    }

    let raw = "";
    req.on("data", (chunk) => {
      raw += String(chunk);
    });
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : null;
      calls.push({ headers: req.headers, body });
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, received: body }));
    });
  });

  return new Promise<{
    url: string;
    calls: typeof calls;
    close: () => Promise<void>;
  }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") throw new Error("Failed to bind stub server");
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        calls,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

describe("Contracts (integration)", () => {
  let app: INestApplication;
  let token: string;
  let companyId: string;
  let schemaName: string;
  let dealId: string;
  let dealIndexId: string;
  let templateId: string;
  let stub: Awaited<ReturnType<typeof startAutentiqueStub>>;
  const correlationId = "cor_test_contracts";

  beforeAll(async () => {
    stub = await startAutentiqueStub();
    process.env.AUTENTIQUE_SERVICE_URL = stub.url;

    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    token = session.accessToken;

    const company = await request(app.getHttpServer())
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Contracts Co" })
      .expect(201);
    companyId = company.body.id;
    schemaName = company.body.schema_name;

    const { admin } = getSupabaseClients();

    const lead = await admin
      .schema("core")
      .from("leads")
      .insert({ company_id: companyId, phone: "+15550000003", name: "Contract Lead" })
      .select("id")
      .single();
    if (lead.error || !lead.data?.id) throw new Error(`Failed to insert lead: ${lead.error?.message ?? "unknown"}`);

    const insertedDeal = await pgQuery<{ id: string }>(
      `insert into ${quoteIdent(schemaName)}.deals (company_id, core_lead_id, deal_full_name, deal_phone, deal_email, deal_status, deal_valor_contrato)
       values ($1,$2,$3,$4,$5,$6,$7)
       returning id`,
      [companyId, String(lead.data.id), "Contract Lead", "+15550000003", "contract.lead@example.com", "negocio_novo", 15000],
    );
    dealId = String(insertedDeal[0]?.id ?? "");
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
    dealIndexId = String(idx.data.id);
  });

  afterAll(async () => {
    await app.close();
    await stub.close();
  });

  it("manages contract templates", async () => {
    const created = await request(app.getHttpServer())
      .post("/contracts/templates")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .field("name", "Template A")
      .field("description", "Contrato padrão")
      .field("variables", JSON.stringify([{ name: "deal_full_name", type: "string" }]))
      .attach("file", Buffer.from("Hello {{deal_full_name}}", "utf8"), { filename: "template.txt", contentType: "text/plain" })
      .expect(201);

    templateId = created.body.id;
    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        company_id: companyId,
        name: "Template A",
        is_active: true,
        file_path: expect.any(String),
      }),
    );

    const list = await request(app.getHttpServer())
      .get("/contracts/templates")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
    expect(list.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: templateId })]));

    const updated = await request(app.getHttpServer())
      .put(`/contracts/templates/${templateId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .field("name", "Template A v2")
      .field("description", "Atualizado")
      .field("variables", JSON.stringify([{ name: "deal_email", type: "string" }]))
      .attach("file", Buffer.from("Hello {{deal_email}}", "utf8"), { filename: "template-v2.txt", contentType: "text/plain" })
      .expect(200);
    expect(updated.body).toEqual(expect.objectContaining({ id: templateId, name: "Template A v2" }));

    await request(app.getHttpServer())
      .delete(`/contracts/templates/${templateId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
  });

  it("creates contract via autentique-service and returns response", async () => {
    // Recreate template for create flow (previous test deletes it).
    const createdTemplate = await request(app.getHttpServer())
      .post("/contracts/templates")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .field("name", "Template For Create")
      .field("variables", "[]")
      .attach("file", Buffer.from("x", "utf8"), { filename: "t.txt", contentType: "text/plain" })
      .expect(201);
    templateId = createdTemplate.body.id;

    const res = await request(app.getHttpServer())
      .post("/contracts")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .set("x-correlation-id", correlationId)
      .send({ deal_id: dealId, template_id: templateId })
      .expect(201);

    expect(res.body).toEqual(expect.objectContaining({ ok: true, received: expect.any(Object) }));
    expect(res.body.received).toEqual(
      expect.objectContaining({
        company_id: companyId,
        template_id: templateId,
        schema_name: schemaName,
        local_deal_id: dealId,
        deal_index_id: dealIndexId,
      }),
    );

    expect(stub.calls.length).toBeGreaterThan(0);
    const last = stub.calls[stub.calls.length - 1];
    expect(last.headers["x-correlation-id"]).toBe(correlationId);
  });

  it("lists, gets and downloads contracts", async () => {
    const { admin } = getSupabaseClients();

    const inserted = await admin
      .schema("core")
      .from("contracts")
      .insert({
        company_id: companyId,
        template_id: templateId,
        deal_index_id: dealIndexId,
        status: "draft",
        contract_url: "https://example.com/contract.pdf",
      })
      .select("id")
      .single();
    if (inserted.error || !inserted.data?.id) throw new Error(`Failed to insert contract: ${inserted.error?.message ?? "unknown"}`);
    const contractId = String(inserted.data.id);

    const list = await request(app.getHttpServer())
      .get("/contracts")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
    expect(list.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: contractId })]));

    const get = await request(app.getHttpServer())
      .get(`/contracts/${contractId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
    expect(get.body).toEqual(expect.objectContaining({ id: contractId, company_id: companyId }));

    const download = await request(app.getHttpServer())
      .get(`/contracts/${contractId}/download`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
    expect(download.body).toEqual(expect.objectContaining({ url: "https://example.com/contract.pdf" }));
  });
});

