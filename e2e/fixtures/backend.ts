import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import Redis from "ioredis";

import { RedisChannels, type RedisChannel } from "@wolfgang/contracts";

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
  process.env.REDIS_URL = process.env.REDIS_URL?.replace("host.docker.internal", "127.0.0.1") ?? "redis://127.0.0.1:6379";
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

export function getServiceUrls() {
  const apiPort = Number(process.env.E2E_API_PORT ?? 4100);
  const evolutionPort = Number(process.env.E2E_EVOLUTION_PORT ?? 4101);
  const autentiquePort = Number(process.env.E2E_AUTENTIQUE_PORT ?? 4102);
  const capiPort = Number(process.env.E2E_CAPI_PORT ?? 4103);
  const agentPort = Number(process.env.E2E_AGENT_PORT ?? 5100);
  const mockPort = Number(process.env.E2E_MOCK_PORT ?? 4900);

  return {
    api: `http://127.0.0.1:${apiPort}`,
    evolution: `http://127.0.0.1:${evolutionPort}`,
    autentique: `http://127.0.0.1:${autentiquePort}`,
    capi: `http://127.0.0.1:${capiPort}`,
    agent: `http://127.0.0.1:${agentPort}`,
    mocks: `http://127.0.0.1:${mockPort}`,
  };
}

export async function loginBackoffice(email: string, password: string) {
  const { api } = getServiceUrls();
  const res = await fetch(`${api}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    throw new Error(`Failed to login via API (${res.status}): ${json?.message ?? "unknown"}`);
  }
  if (!json?.access_token || !json?.refresh_token) {
    throw new Error("Login response missing access_token/refresh_token");
  }
  return {
    accessToken: String(json.access_token),
    refreshToken: String(json.refresh_token),
    user: json.user as any,
  };
}

export function getRedisClient() {
  ensureE2eEnvLoaded();
  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  return new Redis(url, { lazyConnect: true });
}

export async function publishEvent(channel: RedisChannel, payload: unknown) {
  const redis = getRedisClient();
  try {
    await redis.connect();
    await redis.publish(channel, JSON.stringify(payload));
  } finally {
    await redis.quit().catch(() => undefined);
  }
}

export function buildEventEnvelope<TType extends string, TPayload extends object>(args: {
  type: TType;
  company_id: string;
  payload: TPayload;
  source?: string;
  correlation_id?: string;
  causation_id?: string | null;
  occurred_at?: string;
  version?: number;
}) {
  return {
    id: randomUUID(),
    type: args.type,
    version: args.version ?? 1,
    occurred_at: args.occurred_at ?? new Date().toISOString(),
    company_id: args.company_id,
    source: args.source ?? "e2e",
    correlation_id: args.correlation_id ?? randomUUID(),
    causation_id: args.causation_id ?? null,
    payload: args.payload,
  };
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

export async function updateLead(companyId: string, leadId: string, patch: Record<string, unknown>) {
  const { admin } = getSupabaseClients();
  const { error } = await admin.schema("core").from("leads").update(patch).eq("id", leadId).eq("company_id", companyId);
  if (error) throw new Error(`Failed to update lead: ${error.message}`);
}

export async function getLatestContract(companyId: string) {
  const { admin } = getSupabaseClients();
  const { data, error } = await admin
    .schema("core")
    .from("contracts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch latest contract: ${error.message}`);
  return data as any;
}

export async function waitForContractStatus(args: { companyId: string; contractId: string; status: string; timeoutMs?: number }) {
  const timeoutMs = args.timeoutMs ?? 60_000;
  const deadline = Date.now() + timeoutMs;
  const { admin } = getSupabaseClients();
  while (Date.now() < deadline) {
    const { data, error } = await admin
      .schema("core")
      .from("contracts")
      .select("status, signed_at, contract_data")
      .eq("company_id", args.companyId)
      .eq("id", args.contractId)
      .maybeSingle();
    if (error) throw new Error(`Failed to poll contract status: ${error.message}`);
    if (data && String((data as any).status) === args.status) return data as any;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for contract ${args.contractId} status=${args.status}`);
}

export async function waitForCapiLog(args: { companyId: string; sourceId: string; status?: string; timeoutMs?: number }) {
  const timeoutMs = args.timeoutMs ?? 60_000;
  const deadline = Date.now() + timeoutMs;
  const { admin } = getSupabaseClients();

  while (Date.now() < deadline) {
    const { data, error } = await admin
      .schema("core")
      .from("capi_event_logs")
      .select("*")
      .eq("company_id", args.companyId)
      .eq("source_id", args.sourceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Failed to poll capi_event_logs: ${error.message}`);

    if (data) {
      if (!args.status || String((data as any).status) === args.status) return data as any;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(`Timed out waiting for capi_event_logs source_id=${args.sourceId} status=${args.status ?? "(any)"}`);
}

export async function waitForKbDocumentStatus(args: { companyId: string; documentId: string; status: string; timeoutMs?: number }) {
  const timeoutMs = args.timeoutMs ?? 90_000;
  const deadline = Date.now() + timeoutMs;
  const { admin } = getSupabaseClients();
  while (Date.now() < deadline) {
    const { data, error } = await admin
      .schema("core")
      .from("knowledge_documents")
      .select("status, metadata, updated_at")
      .eq("company_id", args.companyId)
      .eq("id", args.documentId)
      .maybeSingle();
    if (error) throw new Error(`Failed to poll knowledge_documents: ${error.message}`);
    if (data && String((data as any).status) === args.status) return data as any;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for knowledge document ${args.documentId} status=${args.status}`);
}

export async function getPixelConfigByPixelId(companyId: string, pixelId: string) {
  const { admin } = getSupabaseClients();
  const { data, error } = await admin
    .schema("core")
    .from("pixel_configs")
    .select("id, pixel_id, is_active, meta_test_event_code")
    .eq("company_id", companyId)
    .eq("pixel_id", pixelId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load pixel config: ${error.message}`);
  if (!data?.id) throw new Error("Pixel config not found");
  return data as any;
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
