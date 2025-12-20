export async function testEvolutionIntegration(args: { apiUrl: string; apiKey: string; signal?: AbortSignal }): Promise<void> {
  const apiKey = args.apiKey.trim();
  const apiUrl = args.apiUrl.trim();
  if (!apiKey || !apiUrl) throw new Error("Missing api_url/api_key");

  const url = `${apiUrl.replace(/\/+$/, "")}/instance/fetchInstances`;
  const res = await fetch(url, {
    method: "GET",
    headers: { apikey: apiKey, authorization: `Bearer ${apiKey}`, "x-api-key": apiKey },
    signal: args.signal,
  });

  if (!res.ok) {
    throw new Error(`Evolution HTTP ${res.status}`);
  }
}

