import { SignJWT, jwtVerify } from "jose";
import { Role } from "@prisma/client";

const secretKey = process.env.JWT_SECRET || "default-dev-secret-bookleaf-2026-portal";
const encodedKey = new TextEncoder().encode(secretKey);

export const AUTH_COOKIE_NAME = "bl_session";

export interface SessionPayload {
  sub: string; // userId
  role: Role;
  email: string;
  name: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });

    return {
      sub: payload.sub as string,
      role: payload.role as Role,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}
