import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  UnauthenticatedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitedError,
  AiUnavailableError,
} from "@/lib/http/errors";

describe("HTTP Error Hierarchy & Status Codes", () => {
  it("maps each domain error to its exact HTTP status code and error code", () => {
    const valErr = new ValidationError("Invalid book selection", [
      { path: "bookId", message: "Book does not belong to author" },
    ]);
    expect(valErr.statusCode).toBe(400);
    expect(valErr.code).toBe("VALIDATION_ERROR");
    expect(valErr.details?.[0].path).toBe("bookId");

    const authErr = new UnauthenticatedError();
    expect(authErr.statusCode).toBe(401);
    expect(authErr.code).toBe("UNAUTHENTICATED");

    const forbidErr = new ForbiddenError();
    expect(forbidErr.statusCode).toBe(403);
    expect(forbidErr.code).toBe("FORBIDDEN");

    const notFoundErr = new NotFoundError("Ticket not found");
    expect(notFoundErr.statusCode).toBe(404);
    expect(notFoundErr.code).toBe("NOT_FOUND");

    const conflictErr = new ConflictError("Ticket is closed");
    expect(conflictErr.statusCode).toBe(409);
    expect(conflictErr.code).toBe("CONFLICT");

    const rateErr = new RateLimitedError();
    expect(rateErr.statusCode).toBe(429);
    expect(rateErr.code).toBe("RATE_LIMITED");

    const aiErr = new AiUnavailableError();
    expect(aiErr.statusCode).toBe(503);
    expect(aiErr.code).toBe("AI_UNAVAILABLE");
  });

  it("ensures custom AppError preserves message, name, and stack", () => {
    const custom = new AppError("Something went wrong", "INTERNAL", 500);
    expect(custom instanceof Error).toBe(true);
    expect(custom.name).toBe("AppError");
    expect(custom.message).toBe("Something went wrong");
  });
});
