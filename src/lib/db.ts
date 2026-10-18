import { neon, Pool } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV !== "production") {
  console.warn("DATABASE_URL is not set. Database queries will fail.");
}

/**
 * Standard serverless HTTP SQL client for Neon Postgres.
 * Recommended by Neon for serverless Next.js route handlers and server components.
 */
export const sql = neon(databaseUrl || "");

/**
 * Connection pool instance (using WebSocket transport via @neondatabase/serverless)
 * for transactions and pooled sessions.
 */
export const pool = new Pool({
  connectionString: databaseUrl,
});

/**
 * Direct (unpooled) connection pool for migrations or session-level operations.
 */
export const unpooledPool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED || databaseUrl,
});
