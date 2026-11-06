import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Uptime probe for monitors (UptimeRobot, Better Stack, Vercel checks). Reports whether the app can reach its
 * database. It returns no data from the database and nothing sensitive.
 */
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "up", ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "degraded", database: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
