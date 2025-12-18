import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: process.env.SERVICE_NAME ?? "backoffice-web",
    timestamp: new Date().toISOString(),
  });
}
