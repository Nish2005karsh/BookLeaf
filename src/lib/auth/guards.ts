import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { AUTH_COOKIE_NAME, verifySessionToken, SessionPayload } from "./jwt";
import { UnauthenticatedError, ForbiddenError } from "../http/errors";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  name: string;
}

/**
 * Extracts and verifies session from the request cookies.
 * Returns null if not authenticated.
 */
export async function getSession(req?: NextRequest): Promise<AuthenticatedUser | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  }

  if (!token) return null;

  const payload: SessionPayload | null = await verifySessionToken(token);
  if (!payload) return null;

  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    name: payload.name,
  };
}

/**
 * Enforces authentication and optional role-based access control.
 * Throws UnauthenticatedError (401) or ForbiddenError (403).
 */
export async function requireAuth(
  req?: NextRequest,
  requiredRole?: Role
): Promise<AuthenticatedUser> {
  const session = await getSession(req);

  if (!session) {
    throw new UnauthenticatedError("Authentication required. Please sign in.");
  }

  if (requiredRole && session.role !== requiredRole) {
    throw new ForbiddenError(
      `Access denied. This action requires ${requiredRole.toLowerCase()} privileges.`
    );
  }

  return session;
}

export async function requireAdmin(req?: NextRequest): Promise<AuthenticatedUser> {
  return requireAuth(req, Role.ADMIN);
}

export async function requireAuthor(req?: NextRequest): Promise<AuthenticatedUser> {
  return requireAuth(req, Role.AUTHOR);
}
