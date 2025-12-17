import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseClients } from "../utils/supabase";

function createUserClient(token: string) {
  const { url, anonKey } = getSupabaseClients();
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("RLS (Supabase)", () => {
  it("isolates core tables by company", async () => {
    const { admin, anon } = getSupabaseClients();

    const companyA = randomUUID();
    const companyB = randomUUID();
    const slugA = `company_a_${companyA.slice(0, 8)}`;
    const slugB = `company_b_${companyB.slice(0, 8)}`;

    await admin.schema("core").from("companies").insert([
      { id: companyA, name: "Company A", slug: slugA, status: "active" },
      { id: companyB, name: "Company B", slug: slugB, status: "active" },
    ]);

    const password = "P@ssw0rd!12345";
    const emailA = `user_a_${companyA.slice(0, 6)}@example.com`;
    const emailB = `user_b_${companyB.slice(0, 6)}@example.com`;

    const userA = await admin.auth.admin.createUser({ email: emailA, password, email_confirm: true });
    const userB = await admin.auth.admin.createUser({ email: emailB, password, email_confirm: true });
    if (userA.error || userB.error || !userA.data.user || !userB.data.user) {
      throw new Error("Failed to create test users");
    }

    await admin.auth.admin.updateUserById(userA.data.user.id, { app_metadata: { role: "crm_manager", company_id: companyA } });
    await admin.auth.admin.updateUserById(userB.data.user.id, { app_metadata: { role: "crm_manager", company_id: companyB } });

    await admin.schema("core").from("company_users").insert([
      { company_id: companyA, user_id: userA.data.user.id, role: "admin" },
      { company_id: companyB, user_id: userB.data.user.id, role: "admin" },
    ]);

    await admin.schema("core").from("leads").insert([
      { company_id: companyA, phone: `+1555${companyA.slice(0, 6)}`, lifecycle_stage: "new" },
      { company_id: companyB, phone: `+1666${companyB.slice(0, 6)}`, lifecycle_stage: "new" },
    ]);

    await admin.schema("core").from("contract_templates").insert([
      { company_id: null, name: "Global Template", variables: [] },
      { company_id: companyA, name: "Company A Template", variables: [] },
      { company_id: companyB, name: "Company B Template", variables: [] },
    ]);

    const sessionA = await anon.auth.signInWithPassword({ email: emailA, password });
    const sessionB = await anon.auth.signInWithPassword({ email: emailB, password });
    if (!sessionA.data.session || !sessionB.data.session) {
      throw new Error("Failed to sign in test users");
    }

    const clientA = createUserClient(sessionA.data.session.access_token);
    const clientB = createUserClient(sessionB.data.session.access_token);

    const leadsA = await clientA.schema("core").from("leads").select("company_id");
    expect(leadsA.error).toBeNull();
    expect((leadsA.data ?? []).every((r: any) => r.company_id === companyA)).toBe(true);

    const leadsB = await clientB.schema("core").from("leads").select("company_id");
    expect(leadsB.error).toBeNull();
    expect((leadsB.data ?? []).every((r: any) => r.company_id === companyB)).toBe(true);

    const insertCrossTenant = await clientA
      .schema("core")
      .from("leads")
      .insert({ company_id: companyB, phone: `+1777${companyB.slice(0, 6)}`, lifecycle_stage: "new" });
    expect(insertCrossTenant.error).not.toBeNull();

    const templatesA = await clientA.schema("core").from("contract_templates").select("company_id");
    expect(templatesA.error).toBeNull();
    const templateCompanyIds = (templatesA.data ?? []).map((r: any) => (r ? r.company_id : null));
    expect(templateCompanyIds).toContain(null);
    expect(templateCompanyIds).toContain(companyA);
    expect(templateCompanyIds).not.toContain(companyB);

    const emailAdmin = `admin_${randomUUID().slice(0, 6)}@example.com`;
    const adminUser = await admin.auth.admin.createUser({ email: emailAdmin, password, email_confirm: true });
    if (adminUser.error || !adminUser.data.user) throw new Error("Failed to create admin user");
    await admin.auth.admin.updateUserById(adminUser.data.user.id, { app_metadata: { role: "backoffice_admin" } });

    const adminSession = await anon.auth.signInWithPassword({ email: emailAdmin, password });
    if (!adminSession.data.session) throw new Error("Failed to sign in admin user");
    const clientAdmin = createUserClient(adminSession.data.session.access_token);

    const leadsAdmin = await clientAdmin.schema("core").from("leads").select("company_id");
    expect(leadsAdmin.error).toBeNull();
    const adminCompanyIds = new Set((leadsAdmin.data ?? []).map((r: any) => (r ? r.company_id : null)));
    expect(adminCompanyIds.has(companyA)).toBe(true);
    expect(adminCompanyIds.has(companyB)).toBe(true);
  });
});
