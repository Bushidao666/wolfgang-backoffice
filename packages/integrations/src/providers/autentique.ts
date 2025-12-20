function resolveAutentiqueEndpoint(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  if (base.endsWith("/graphql")) return base;
  if (base.endsWith("/v2")) return `${base}/graphql`;
  return `${base}/v2/graphql`;
}

export async function testAutentiqueIntegration(args: { apiKey: string; baseUrl?: string; signal?: AbortSignal }): Promise<void> {
  const apiKey = args.apiKey.trim();
  if (!apiKey) throw new Error("Missing api_key");

  const baseUrl = args.baseUrl?.trim() || "https://api.autentique.com.br";
  const endpoint = resolveAutentiqueEndpoint(baseUrl);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "query{__typename}", variables: {} }),
    signal: args.signal,
  });

  if (!res.ok) {
    throw new Error(`Autentique HTTP ${res.status}`);
  }
}

