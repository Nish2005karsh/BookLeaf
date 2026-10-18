import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Normalizes connection URL for Neon Serverless PgBouncer poolers.
 * Appends pgbouncer=true & connect_timeout=15 to prevent
 * "Error in PostgreSQL connection: Error { kind: Closed, cause: None }"
 * when Neon compute endpoints suspend after idle periods.
 */
function getDatasources() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    let changed = false;

    // Neon pooler endpoint requires pgbouncer=true for Prisma
    if (url.host.includes("pooler") || url.port === "5432") {
      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
        changed = true;
      }
      if (!url.searchParams.has("connect_timeout")) {
        url.searchParams.set("connect_timeout", "15");
        changed = true;
      }
    }

    if (changed) {
      return { db: { url: url.toString() } };
    }
  } catch {
    // If URL parsing fails, default to standard environment variable
  }

  return undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: getDatasources(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
