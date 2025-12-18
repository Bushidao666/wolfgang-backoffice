import { normalizeBaseUrl } from "@/lib/url";

type RuntimeConfig = {
  apiUrl: string | null;
  evolutionManagerUrl: string | null;
};

let cached: RuntimeConfig | null = null;
let inFlight: Promise<RuntimeConfig> | null = null;

async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  if (cached) return cached;
  if (!inFlight) {
    inFlight = fetch("/api/runtime-config", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return { apiUrl: null, evolutionManagerUrl: null } satisfies RuntimeConfig;
        return (await res.json()) as RuntimeConfig;
      })
      .then((json) => {
        cached = {
          apiUrl: typeof json.apiUrl === "string" && json.apiUrl.trim() ? json.apiUrl.trim() : null,
          evolutionManagerUrl:
            typeof json.evolutionManagerUrl === "string" && json.evolutionManagerUrl.trim()
              ? json.evolutionManagerUrl.trim()
              : null,
        };
        return cached;
      })
      .catch(() => ({ apiUrl: null, evolutionManagerUrl: null } satisfies RuntimeConfig))
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export async function resolveApiUrl(): Promise<string> {
  const fromBuild = process.env.NEXT_PUBLIC_API_URL;
  if (fromBuild) return normalizeBaseUrl(fromBuild);

  if (process.env.NODE_ENV !== "production") return "http://localhost:4000";

  const runtime = await fetchRuntimeConfig();
  if (runtime.apiUrl) return normalizeBaseUrl(runtime.apiUrl);

  throw new Error("NEXT_PUBLIC_API_URL is required in production (set it in your deployment env).");
}

export async function resolveEvolutionManagerUrl(): Promise<string> {
  const fromBuild = process.env.NEXT_PUBLIC_EVOLUTION_MANAGER_URL;
  if (fromBuild) return normalizeBaseUrl(fromBuild);

  if (process.env.NODE_ENV !== "production") return "http://localhost:4001";

  const runtime = await fetchRuntimeConfig();
  if (runtime.evolutionManagerUrl) return normalizeBaseUrl(runtime.evolutionManagerUrl);

  throw new Error("NEXT_PUBLIC_EVOLUTION_MANAGER_URL is required in production (set it in your deployment env).");
}

