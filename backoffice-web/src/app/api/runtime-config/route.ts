import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function readEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

export function GET() {
  return NextResponse.json(
    {
      apiUrl: readEnv("NEXT_PUBLIC_API_URL"),
      evolutionManagerUrl: readEnv("NEXT_PUBLIC_EVOLUTION_MANAGER_URL"),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
