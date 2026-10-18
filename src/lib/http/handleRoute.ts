import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ErrorCode } from "./errors";

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: Array<{ path?: string; message: string }>;
  };
}

export function handleRoute(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (err: unknown) {
      // Re-throw Next.js internal signals (dynamic bailouts, redirects, not-found)
      if (
        typeof err === "object" &&
        err !== null &&
        "digest" in err &&
        typeof (err as { digest: unknown }).digest === "string" &&
        (err as { digest: string }).digest.startsWith("NEXT_")
      ) {
        throw err;
      }
      if (err instanceof AppError) {
        return NextResponse.json<ErrorEnvelope>(
          {
            error: {
              code: err.code,
              message: err.message,
              details: err.details,
            },
          },
          { status: err.statusCode }
        );
      }

      if (err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));

        return NextResponse.json<ErrorEnvelope>(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: details[0]?.message || "Validation failed",
              details,
            },
          },
          { status: 400 }
        );
      }

      // Prisma known errors
      if (typeof err === "object" && err !== null && "code" in err) {
        const prismaErr = err as { code: string; message: string };
        if (prismaErr.code === "P2002") {
          return NextResponse.json<ErrorEnvelope>(
            {
              error: {
                code: "CONFLICT",
                message: "A record with this identifier already exists.",
              },
            },
            { status: 409 }
          );
        }
        if (prismaErr.code === "P2025") {
          return NextResponse.json<ErrorEnvelope>(
            {
              error: {
                code: "NOT_FOUND",
                message: "Resource not found",
              },
            },
            { status: 404 }
          );
        }
      }

      console.error("[Unhandled Route Error]:", err);

      return NextResponse.json<ErrorEnvelope>(
        {
          error: {
            code: "INTERNAL",
            message: "An internal server error occurred",
          },
        },
        { status: 500 }
      );
    }
  };
}
