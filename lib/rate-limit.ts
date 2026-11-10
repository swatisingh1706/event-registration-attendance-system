import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Fixed-window rate limiter backed by PostgreSQL, so it works across serverless
 * instances. The increment is a single atomic upsert.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSeconds}::float8) THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSeconds}::float8) THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 1);
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Housekeeping: drop stale counters (called opportunistically). */
export async function pruneRateLimits() {
  await prisma.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } });
}
