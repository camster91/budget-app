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

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/health")
  ) {
    return NextResponse.next();
  }

  // Allow public paths (strip locale prefix if needed)
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, "") || "/";
  if (PUBLIC_PATHS.some((p) => pathWithoutLocale.startsWith(p))) {
    return intlMiddleware(request);
  }

  // Allow public prefixes (health checks, cron)
  if (PUBLIC_PREFIXES.some((p) => pathWithoutLocale.startsWith(p))) {
    return intlMiddleware(request);
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

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
