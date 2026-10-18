import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/http/handleRoute";
import { AUTH_COOKIE_NAME } from "@/lib/auth/jwt";

export const POST = handleRoute(async () => {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
});
