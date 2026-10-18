import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/http/handleRoute";
import { UnauthenticatedError, RateLimitedError } from "@/lib/http/errors";
import { signSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { checkRateLimit } from "@/lib/auth/rateLimit";

const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = loginSchema.parse(body);
  const email = parsed.email.toLowerCase().trim();

  // Rate limit by IP and email
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const rateLimitKey = `login:${clientIp}:${email}`;
  const rateCheck = checkRateLimit(rateLimitKey, 10, 60 * 1000);

  if (!rateCheck.success) {
    throw new RateLimitedError("Too many login attempts. Please wait a minute and try again.");
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Compare password hash
  const isValid = user ? await bcrypt.compare(parsed.password, user.passwordHash) : false;

  if (!user || !isValid) {
    // Generic message to prevent email enumeration
    throw new UnauthenticatedError("Invalid email or password");
  }

  // Sign session token
  const token = await signSessionToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });

  // Set secure httpOnly cookie
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
});
