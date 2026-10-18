import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { AUTH_COOKIE_NAME } from "./lib/auth/jwt";

const secretKey = process.env.JWT_SECRET || "default-dev-secret-bookleaf-2026-portal";
const encodedKey = new TextEncoder().encode(secretKey);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAuthorRoute = pathname.startsWith("/author");
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/login" || pathname === "/";

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  let user: { sub: string; role: string; email: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, encodedKey, {
        algorithms: ["HS256"],
      });
      user = {
        sub: payload.sub as string,
        role: payload.role as string,
        email: payload.email as string,
      };
    } catch {
      user = null;
    }
  }

  // 1. Unauthenticated trying to access protected routes -> redirect to /login
  if ((isAuthorRoute || isAdminRoute) && !user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Role restriction: Authors cannot access /admin
  if (isAdminRoute && user && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/author", req.url));
  }

  // 3. Already authenticated user visiting /login -> redirect to their portal
  if (isLoginRoute && user) {
    if (user.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.redirect(new URL("/author", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (handled by requireAuth in handlers)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, svg
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
