import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Hosted Postgres providers (Neon, Supabase) front the database with PgBouncer in transaction mode.
 * Prisma must then skip prepared statements and cap its own pool, or concurrent requests can fail.
 * Plain local PostgreSQL URLs are passed through unchanged.
 */
function datasourceUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (!/-pooler\.|pooler\.supabase\.com|pgbouncer/i.test(url)) return url;
  const u = new URL(url);
  if (!u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
  if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "5");
  return u.toString();
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: datasourceUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
