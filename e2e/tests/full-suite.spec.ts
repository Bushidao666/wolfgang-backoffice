import { expect, test, type Page } from "@playwright/test";
import path from "path";

import {
  createBackofficeAdminUser,
  getCompanyByName,
  getPixelConfigByPixelId,
  getServiceUrls,
  getSupabaseClients,
  getLatestContract,
  loginBackoffice,
  seedLeadWithTimeline,
  seedTenantDeal,
  updateLead,
  waitForCapiLog,
  waitForContractStatus,
  waitForKbDocumentStatus,
} from "../fixtures/backend";

function getWebBaseUrl() {
  const webPort = process.env.E2E_WEB_PORT ?? "3100";
  const base = process.env.E2E_BASE_URL ?? `http://localhost:${webPort}`;
  return base.replace(/\/+$/, "");
}

async function waitForCompanyProvisioned(name: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      return await getCompanyByName(name);
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(`Timed out waiting for company provisioned: ${name}`);
}

async function authenticate(page: Page, tokens: { accessToken: string; refreshToken: string }) {
  const baseURL = getWebBaseUrl();
  await page.context().addCookies([
    { name: "bo_access_token", value: tokens.accessToken, url: baseURL },
    { name: "bo_refresh_token", value: tokens.refreshToken, url: baseURL },
  ]);
}

async function selectCompany(page: Page, companyId: string) {
  const select = page.locator("select#company");
  await expect(select).toBeVisible();
  await select.selectOption(companyId);
}

test.describe.serial("Wolfgang Backoffice - Full E2E", () => {
  let admin: Awaited<ReturnType<typeof createBackofficeAdminUser>>;
  let tokens: Awaited<ReturnType<typeof loginBackoffice>>;

  let company: { id: string; slug: string; schemaName: string };
  let leadId: string;
  let dealId: string;

  test.beforeAll(async () => {
    admin = await createBackofficeAdminUser();
    tokens = await loginBackoffice(admin.email, admin.password);
  });

  test("services are healthy", async () => {
    const urls = getServiceUrls();
    const web = getWebBaseUrl();
    const supabase = getSupabaseClients().url;

    const checks = [
      fetch(`${web}/api/health`),
      fetch(`${urls.api}/health`),
      fetch(`${urls.evolution}/health`),
      fetch(`${urls.autentique}/health`),
      fetch(`${urls.capi}/health`),
      fetch(`${urls.agent}/health`),
      fetch(`${urls.mocks}/health`),
      fetch(`${supabase}/auth/v1/health`),
    ];

    const results = await Promise.all(checks);
    for (const res of results) {
      expect(res.ok).toBeTruthy();
    }
  });

  test("auth: login UI + logout", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(admin.email);
    await page.locator("#password").fill(admin.password);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/empresas/);
    await expect(page.getByRole("heading", { name: "Empresas" })).toBeVisible();

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  });

  test("companies: create + verify provisioned", async ({ page }) => {
    await authenticate(page, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    await page.goto("/empresas");

    await expect(page.getByRole("heading", { name: "Empresas" })).toBeVisible();

    const companyName = `Empresa Full E2E ${Date.now()}`;
    await page.getByRole("button", { name: /Nova empresa/i }).click();
    await page.locator("input#name").fill(companyName);
    await page.locator("input#document").fill("00.000.000/0000-00");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByRole("cell", { name: companyName })).toBeVisible();

    company = await waitForCompanyProvisioned(companyName, 90_000);
    expect(company.id).toBeTruthy();
    expect(company.schemaName).toBeTruthy();

    await page.getByPlaceholder("Buscar por nome...").fill(companyName);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByRole("cell", { name: companyName })).toBeVisible();
  });

  test("leads + deals: list + details/timeline", async ({ page }) => {
    const seeded = await seedLeadWithTimeline({
      companyId: company.id,
      leadName: "Lead Full E2E",
      phone: `+1555${String(Date.now()).slice(-7)}`,
      message: "Mensagem E2E (timeline)",
    });
    leadId = seeded.leadId;

    const dealSeed = await seedTenantDeal({
      companyId: company.id,
      schemaName: company.schemaName,
      leadId,
      fullName: "Lead Full E2E",
      phone: "555-e2e",
      email: "lead.full.e2e@example.com",
    });
    dealId = dealSeed.dealId;

    await authenticate(page, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });

    await page.goto(`/leads?company_id=${encodeURIComponent(company.id)}`);
    await expect(page.getByRole("heading", { name: "Leads" }).first()).toBeVisible();
    await selectCompany(page, company.id);

    const leadRow = page.getByRole("row", { name: /Lead Full E2E/ });
    await expect(leadRow).toBeVisible();
    await leadRow.getByRole("button", { name: "Detalhes" }).click();

    await expect(page.getByRole("heading", { name: "Detalhes do lead" })).toBeVisible();
    await expect(page.getByText("Mensagem E2E (timeline)")).toBeVisible();

    await page.goto("/deals");
    await expect(page.getByRole("heading", { name: "Deals" }).first()).toBeVisible();
    await selectCompany(page, company.id);

    const dealRow = page.getByRole("row", { name: /Lead Full E2E/ });
    await expect(dealRow).toBeVisible();
    await dealRow.getByRole("button", { name: "Detalhes" }).click();

    await expect(page.getByRole("heading", { name: "Detalhes do Deal" })).toBeVisible();
    const dealDialog = page.getByRole("dialog", { name: "Detalhes do Deal" });
    const timelineSection = dealDialog.getByText("Timeline (mensagens)").locator("..");
    await expect(timelineSection.getByText("Mensagem E2E (timeline)")).toBeVisible();
  });

  test("centurions: create + playground test (agent-runtime)", async ({ page }) => {
    await authenticate(page, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });

    await page.goto(`/centurions?company_id=${encodeURIComponent(company.id)}`);
    await expect(page.getByRole("heading", { name: "Centurions" }).first()).toBeVisible();
    await selectCompany(page, company.id);

    await page.getByRole("button", { name: "Novo centurion" }).click();
    await expect(page).toHaveURL(/\/centurions\/new/);

    const centurionName = `SDR Full E2E ${Date.now()}`;
    await page.locator("input#name").fill(centurionName);
    await page.getByRole("button", { name: "Gerar" }).click();

    await page.locator('textarea[placeholder^="Você é um SDR"]').fill("Você é um SDR de teste (E2E).");
    await page.getByRole("button", { name: "Criar" }).click();

    await expect(page).toHaveURL(/\/centurions\/[0-9a-fA-F-]{36}/);

    await page.getByPlaceholder("Digite uma mensagem para testar...").fill("Oi Centurion");
    await page.getByRole("button", { name: "Enviar" }).click();

    await expect(page.getByText("E2E: Oi Centurion")).toBeVisible();
  });

  test("knowledge base: upload -> ready -> chunks -> delete", async ({ page }) => {
    await authenticate(page, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });

    await page.goto("/knowledge-base");
    await expect(page.getByRole("heading", { name: "Knowledge Base" })).toBeVisible();
    await selectCompany(page, company.id);

    const repoRoot = path.resolve(__dirname, "../..");
    const kbFile = path.join(repoRoot, "e2e", "fixtures", "files", "kb-sample.txt");

    const title = `KB Full E2E ${Date.now()}`;
    await page.locator("input#kb_title").fill(title);
    await page.locator("input#kb_file").setInputFiles(kbFile);

    const uploadRespPromise = page.waitForResponse((resp) => {
      return resp.url().includes("/knowledge-base/documents") && resp.request().method() === "POST" && resp.status() < 400;
    });

    await page.getByRole("button", { name: "Enviar" }).click();

    const uploadResp = await uploadRespPromise;
    const created = (await uploadResp.json()) as { id: string };
    expect(created.id).toBeTruthy();

    await waitForKbDocumentStatus({ companyId: company.id, documentId: created.id, status: "ready", timeoutMs: 120_000 });

    await page.reload();
    await expect(page.getByRole("cell", { name: title })).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(title) }).getByText("ready")).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(title) });
    await row.getByRole("button", { name: "Chunks" }).click();

    await expect(page.getByRole("heading", { name: new RegExp(`Chunks: ${title}`) })).toBeVisible();
    await expect(page.getByText("Wolfgang E2E Knowledge Base")).toBeVisible();

    await page.keyboard.press("Escape");

    await row.getByRole("button", { name: "Remover" }).click();
    await expect(page.getByRole("cell", { name: title })).toHaveCount(0);
  });

  test("instances: whatsapp + telegram create/connect/test/disconnect/delete", async ({ page }) => {
    await authenticate(page, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });

    await page.goto("/instancias");
    await expect(page.getByRole("heading", { name: "Instâncias" }).first()).toBeVisible();
    await selectCompany(page, company.id);

    const createWhatsapp = async (name: string) => {
      await page.getByRole("button", { name: "Nova instância" }).click();
      const dialog = page.getByRole("dialog", { name: "Nova instância" });
      await expect(dialog).toBeVisible();
      await dialog.locator("select#channel_type").selectOption("whatsapp");
      await dialog.locator("input#instance_name").fill(name);
      await dialog.getByRole("button", { name: "Criar" }).click();
      await expect(page.getByRole("cell", { name })).toBeVisible();
    };

    const createTelegram = async (name: string) => {
      await page.getByRole("button", { name: "Nova instância" }).click();
      const dialog = page.getByRole("dialog", { name: "Nova instância" });
      await expect(dialog).toBeVisible();
      await dialog.locator("select#channel_type").selectOption("telegram");
      await dialog.locator("input#instance_name").fill(name);
      await dialog.locator("input#telegram_bot_token").fill("123456:TEST_TOKEN");
      await dialog.getByRole("button", { name: "Criar" }).click();
      await expect(page.getByRole("cell", { name })).toBeVisible();
    };

    const testMessage = async (rowName: string, to: string) => {
      const row = page.getByRole("row", { name: new RegExp(rowName) });
      await row.getByRole("button", { name: "Testar" }).click();
      const dialog = page.getByRole("dialog", { name: "Teste de envio" });
      await expect(dialog).toBeVisible();
      await dialog.locator("input#to").fill(to);
      await dialog.getByRole("button", { name: "Enviar" }).click();
      await expect(dialog).toHaveCount(0);
    };

    const removeInstance = async (rowName: string) => {
      page.once("dialog", (d) => d.accept());
      const row = page.getByRole("row", { name: new RegExp(rowName) });
      await row.getByRole("button", { name: "Remover" }).click();
      await expect(page.getByRole("cell", { name: rowName })).toHaveCount(0);
    };

    const waName = `wa_full_e2e_${Date.now()}`;
    await createWhatsapp(waName);

    const waRow = page.getByRole("row", { name: new RegExp(waName) });
    await waRow.getByRole("button", { name: "QR" }).click();
    const qrDialog = page.getByRole("dialog", { name: "Conectar instância" });
    await expect(qrDialog).toBeVisible();
    await expect(qrDialog.getByRole("img", { name: "QR Code" })).toBeVisible();
    await qrDialog.getByRole("button", { name: "Fechar" }).click();

    await testMessage(waName, "5511999999999");
    await waRow.getByRole("button", { name: "Desconectar" }).click();
    await removeInstance(waName);

    const tgName = `tg_full_e2e_${Date.now()}`;
    await createTelegram(tgName);

    const tgRow = page.getByRole("row", { name: new RegExp(tgName) });
    await tgRow.getByRole("button", { name: "Conectar" }).click();
    await testMessage(tgName, "telegram:123");
    await tgRow.getByRole("button", { name: "Desconectar" }).click();
    await removeInstance(tgName);
  });

  test("marketing + contracts: pixel test + contract signed webhook + CAPI log sent", async ({ page }) => {
    await authenticate(page, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });

    const pixelId = `pixel_${Date.now()}`;
    await page.goto("/marketing");
    await expect(page.getByRole("heading", { name: "Marketing" })).toBeVisible();
    await selectCompany(page, company.id);

    await page.getByRole("button", { name: "Novo pixel" }).click();
    const pixelDialog = page.getByRole("dialog", { name: "Novo pixel" });
    await expect(pixelDialog).toBeVisible();
    await pixelDialog.locator("input#pixelId").fill(pixelId);
    await pixelDialog.locator("input#token").fill("E2E_META_TOKEN");
    await pixelDialog.locator("input#testCode").fill("TEST123");
    await pixelDialog.getByRole("button", { name: "Salvar" }).click();

    const pixelRow = page.getByRole("row", { name: new RegExp(pixelId) });
    await expect(pixelRow).toBeVisible();

    await pixelRow.getByRole("button", { name: "Testar" }).click();
    await expect(page.getByText("Resultado do teste")).toBeVisible();
    await page.getByText("Resultado do teste").click();
    await expect(page.getByText(/events_received/)).toBeVisible();

    const pixel = await getPixelConfigByPixelId(company.id, pixelId);
    await updateLead(company.id, leadId, { pixel_config_id: String(pixel.id) });

    await page.goto("/contratos");
    await expect(page.getByRole("heading", { name: "Contratos" }).first()).toBeVisible();
    await selectCompany(page, company.id);

    // Create template
    await page.getByRole("button", { name: "Novo template" }).click();
    const tmplDialog = page.getByRole("dialog", { name: "Novo template" });
    await expect(tmplDialog).toBeVisible();

    const repoRoot = path.resolve(__dirname, "../..");
    const tmplFile = path.join(repoRoot, "e2e", "fixtures", "files", "contract-template.txt");
    await tmplDialog.locator("input#name").fill(`Template Full E2E ${Date.now()}`);
    await tmplDialog.locator("input#category").fill("general");
    await tmplDialog.locator("textarea#variables").fill("[]");
    await tmplDialog.locator("input#file").setInputFiles(tmplFile);
    await tmplDialog.getByRole("button", { name: "Salvar" }).click();

    // Create contract
    await expect(page.getByRole("heading", { name: "Gerar contrato" })).toBeVisible();
    await page.locator("select#deal").selectOption(dealId);
    await page.locator("textarea#contractData").fill(JSON.stringify({ deal_servico: "Buffet" }));

    await page.getByRole("button", { name: "Gerar e enviar" }).click();
    await expect(page.getByText("Link de assinatura:")).toBeVisible();

    const contract = await getLatestContract(company.id);
    expect(contract?.id).toBeTruthy();
    expect(contract?.autentique_id).toBeTruthy();

    const { autentique } = getServiceUrls();
    const webhookRes = await fetch(`${autentique}/webhooks/autentique`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: { type: "document.finished", data: { object: { id: contract.autentique_id } } },
      }),
    });
    expect(webhookRes.ok).toBeTruthy();

    await waitForContractStatus({ companyId: company.id, contractId: String(contract.id), status: "signed", timeoutMs: 90_000 });
    await waitForCapiLog({ companyId: company.id, sourceId: String(contract.id), status: "sent", timeoutMs: 90_000 });

    await page.goto("/marketing");
    await selectCompany(page, company.id);
    await page.locator("input#status").fill("sent");
    await page.getByRole("button", { name: "Atualizar" }).click();
    await expect(page.getByRole("row", { name: /Purchase/ })).toBeVisible();
  });
});
