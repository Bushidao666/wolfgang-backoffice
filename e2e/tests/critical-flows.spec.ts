import { expect, test } from "@playwright/test";

import { createBackofficeAdminUser, getCompanyByName, seedLeadWithTimeline, seedTenantDeal } from "../fixtures/backend";

test("login + create company + leads timeline + deals list", async ({ page }) => {
  const admin = await createBackofficeAdminUser();

  await page.goto("/login");
  await page.locator("#email").fill(admin.email);
  await page.locator("#password").fill(admin.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/empresas/);
  await expect(page.getByRole("heading", { name: "Empresas" })).toBeVisible();

  const companyName = `Empresa E2E ${Date.now()}`;
  await page.getByRole("button", { name: /Nova empresa/i }).click();
  await page.locator("input#name").fill(companyName);
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page.getByRole("cell", { name: companyName })).toBeVisible();

  const company = await getCompanyByName(companyName);

  const seeded = await seedLeadWithTimeline({
    companyId: company.id,
    leadName: "Lead E2E",
    phone: `+1555${String(Date.now()).slice(-7)}`,
    message: "Oi do E2E",
  });

  await seedTenantDeal({
    companyId: company.id,
    schemaName: company.schemaName,
    leadId: seeded.leadId,
    fullName: "Lead E2E",
    phone: "555-e2e",
    email: "lead.e2e@example.com",
  });

  await page.goto(`/leads?company_id=${encodeURIComponent(company.id)}`);
  await expect(page.getByRole("heading", { name: "Leads" }).first()).toBeVisible();
  await page.locator("select#company").selectOption(company.id);

  const leadRow = page.getByRole("row", { name: /Lead E2E/ });
  await expect(leadRow).toBeVisible();
  await leadRow.getByRole("button", { name: "Detalhes" }).click();
  await expect(page.getByRole("heading", { name: "Detalhes do lead" })).toBeVisible();
  await expect(page.getByText("Oi do E2E")).toBeVisible();

  await page.goto("/deals");
  await expect(page.getByRole("heading", { name: "Deals" }).first()).toBeVisible();
  await page.locator("select#company").selectOption(company.id);
  await expect(page.getByRole("cell", { name: "Lead E2E" })).toBeVisible();
});
