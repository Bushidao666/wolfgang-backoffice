import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";

function loadDotEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function ensureE2eEnvLoaded() {
  const repoRoot = path.resolve(__dirname, "../..");
  loadDotEnvFile(path.join(repoRoot, ".env"));

  process.env.SUPABASE_URL =
    process.env.SUPABASE_URL?.replace("host.docker.internal", "127.0.0.1") ?? "http://127.0.0.1:54321";
  process.env.SUPABASE_DB_URL =
    process.env.SUPABASE_DB_URL?.replace("host.docker.internal", "127.0.0.1") ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
}

type SupabaseClients = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  anon: SupabaseClient;
  admin: SupabaseClient;
};

export function getSupabaseClients(): SupabaseClients {
  ensureE2eEnvLoaded();
  const url = (process.env.SUPABASE_URL ?? "http://127.0.0.1:54321").replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!anonKey || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY for e2e tests");
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
    anon: createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    admin: createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

export async function createBackofficeAdminUser() {
  const { admin } = getSupabaseClients();
  const email = `e2e_admin_${randomUUID().slice(0, 8)}@example.com`;
  const password = "P@ssw0rd!12345";

  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) {
    throw new Error(`Failed to create e2e user: ${created.error?.message ?? "unknown"}`);
  }

  const updated = await admin.auth.admin.updateUserById(created.data.user.id, {
    app_metadata: { role: "backoffice_admin" },
  });
  if (updated.error) {
    throw new Error(`Failed to update e2e user metadata: ${updated.error.message}`);
  }

  return { userId: created.data.user.id, email, password };
}

export async function getCompanyByName(name: string) {
  const { admin } = getSupabaseClients();

  const company = await admin.schema("core").from("companies").select("id, slug").eq("name", name).maybeSingle();
  if (company.error) throw new Error(`Failed to load company: ${company.error.message}`);
  if (!company.data?.id) throw new Error("Company not found");

  const crm = await admin
    .schema("core")
    .from("company_crms")
    .select("schema_name")
    .eq("company_id", company.data.id)
    .eq("is_primary", true)
    .maybeSingle();
  if (crm.error) throw new Error(`Failed to load company crm: ${crm.error.message}`);
  if (!crm.data?.schema_name) throw new Error("Company CRM schema not found");

  return { id: String(company.data.id), slug: String(company.data.slug), schemaName: String(crm.data.schema_name) };
}

export async function seedLeadWithTimeline(args: { companyId: string; leadName: string; phone: string; message: string }) {
  const { admin } = getSupabaseClients();

  const centurion = await admin
    .schema("core")
    .from("centurion_configs")
    .insert({ company_id: args.companyId, name: "SDR E2E", slug: `sdr_e2e_${randomUUID().slice(0, 6)}`, prompt: "Você é um SDR." })
    .select("id")
    .single();
  if (centurion.error || !centurion.data?.id) {
    throw new Error(`Failed to create centurion: ${centurion.error?.message ?? "unknown"}`);
  }

  const lead = await admin
    .schema("core")
    .from("leads")
    .insert({ company_id: args.companyId, phone: args.phone, name: args.leadName, centurion_id: centurion.data.id })
    .select("id")
    .single();
  if (lead.error || !lead.data?.id) throw new Error(`Failed to create lead: ${lead.error?.message ?? "unknown"}`);

  const convo = await admin
    .schema("core")
    .from("conversations")
    .insert({
      company_id: args.companyId,
      lead_id: lead.data.id,
      centurion_id: centurion.data.id,
      channel_type: "whatsapp",
    })
    .select("id")
    .single();
  if (convo.error || !convo.data?.id) throw new Error(`Failed to create conversation: ${convo.error?.message ?? "unknown"}`);

  const msg = await admin.schema("core").from("messages").insert({
    company_id: args.companyId,
    lead_id: lead.data.id,
    conversation_id: convo.data.id,
    direction: "inbound",
    content_type: "text",
    content: args.message,
  });
  if (msg.error) throw new Error(`Failed to create message: ${msg.error.message}`);

  return { leadId: String(lead.data.id), centurionId: String(centurion.data.id), conversationId: String(convo.data.id) };
}

function ensureDbUrl() {
  ensureE2eEnvLoaded();
  const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("Missing SUPABASE_DB_URL (or DATABASE_URL) for e2e tests");
  return url;
}

function quoteIdent(name: string) {
  if (!/^[a-z0-9_]+$/i.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `"${name}"`;
}

export async function seedTenantDeal(args: { companyId: string; schemaName: string; leadId: string; fullName: string; phone: string; email: string }) {
  const dbUrl = ensureDbUrl();
  const pool = new Pool({ connectionString: dbUrl, max: 2 });
  try {
    const schemaIdent = quoteIdent(args.schemaName);
    const res = await pool.query<{ id: string }>(
      `insert into ${schemaIdent}.deals (company_id, core_lead_id, deal_full_name, deal_phone, deal_email, deal_status)
       values ($1,$2,$3,$4,$5,$6)
       returning id`,
      [args.companyId, args.leadId, args.fullName, args.phone, args.email, "negocio_novo"],
    );
    const dealId = String(res.rows?.[0]?.id ?? "");
    if (!dealId) throw new Error("Failed to insert tenant deal");

    const { admin } = getSupabaseClients();
    const idx = await admin
      .schema("core")
      .from("deals_index")
      .select("id")
      .eq("company_id", args.companyId)
      .eq("schema_name", args.schemaName)
      .eq("local_deal_id", dealId)
      .maybeSingle();
    if (idx.error || !idx.data?.id) throw new Error(`Failed to load deals_index: ${idx.error?.message ?? "missing"}`);

    return { dealId, dealIndexId: String(idx.data.id) };
  } finally {
    await pool.end().catch(() => undefined);
  }
}
