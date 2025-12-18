import type { SupabaseClient } from "@supabase/supabase-js";

import { encryptJson } from "@wolfgang/crypto";

import { resolveCompanyIntegration } from "./index";

function makeFakeSupabase(tables: Record<string, any[]>) {
  const fake: any = {
    schema: () => fake,
    from: (table: string) => {
      const state = { table, filters: [] as Array<[string, string, any]> };
      const chain: any = {
        select: () => chain,
        eq: (col: string, value: any) => {
          state.filters.push(["eq", col, value]);
          return chain;
        },
        maybeSingle: async () => {
          const rows = (tables[table] ?? []).filter((r) =>
            state.filters.every(([op, col, val]) => (op === "eq" ? String(r[col]) === String(val) : true)),
          );
          return { data: rows[0] ?? null, error: null };
        },
      };
      return chain;
    },
  };
  return fake as SupabaseClient;
}

describe("@wolfgang/integrations", () => {
  it("resolves default set when no binding exists", async () => {
    const secrets = encryptJson({ api_key: "x" }, { current: "k1" });

    const client = makeFakeSupabase({
      integration_credential_sets: [{ id: "s1", provider: "openai", is_default: true, config: { base_url: "x" }, secrets_enc: secrets }],
      company_integration_bindings: [],
    });

    const prev = process.env.APP_ENCRYPTION_KEY_CURRENT;
    process.env.APP_ENCRYPTION_KEY_CURRENT = "k1";
    try {
      const out = await resolveCompanyIntegration({ supabaseAdmin: client, companyId: "c1", provider: "openai" });
      expect(out?.source).toBe("global");
      expect(out?.credential_set_id).toBe("s1");
      expect(out?.secrets).toEqual({ api_key: "x" });
    } finally {
      if (prev === undefined) delete process.env.APP_ENCRYPTION_KEY_CURRENT;
      else process.env.APP_ENCRYPTION_KEY_CURRENT = prev;
    }
  });
});
