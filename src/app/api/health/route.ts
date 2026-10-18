import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const startTime = Date.now();

  // Retry once for potential cold starts
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await sql`
        SELECT 
          NOW() as current_time, 
          version() as pg_version, 
          current_database() as database_name
      `;

      return NextResponse.json({
        status: "ok",
        service: "Neon Postgres",
        branch: process.env.NEON_BRANCH || "production",
        database: result[0]?.database_name,
        timestamp: result[0]?.current_time,
        version: result[0]?.pg_version,
        latencyMs: Date.now() - startTime,
        attempt,
      });
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        // Wait 500ms before retrying
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  return NextResponse.json(
    {
      status: "error",
      service: "Neon Postgres",
      error: lastError instanceof Error ? lastError.message : String(lastError),
      latencyMs: Date.now() - startTime,
    },
    { status: 500 }
  );
}
