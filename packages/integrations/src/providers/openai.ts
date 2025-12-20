export async function testOpenAIIntegration(args: { apiKey: string; baseUrl?: string; signal?: AbortSignal }): Promise<void> {
  const apiKey = args.apiKey.trim();
  if (!apiKey) throw new Error("Missing api_key");

  const base = (args.baseUrl?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const res = await fetch(`${base}/models`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: args.signal,
  });

  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}`);
  }
}

