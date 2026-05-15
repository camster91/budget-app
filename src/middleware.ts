import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { verifyToken } from "@/lib/auth";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";

const PUBLIC_PATHS = [
    "/login",
    "/register",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/auth/me",      // GET — read-only profile
    "/api/cron",         // guarded by CRON_SECRET in route handlers
    "/sw.js",
    "/manifest.json",
];

const PUBLIC_PREFIXES = [
    "/api/cron/",        // cron sub-routes
    "/api/health",
];

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Public pages: no auth required
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Public prefixes
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Auth check for protected routes
  const token = request.cookies.get("budget_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("budget_token");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
