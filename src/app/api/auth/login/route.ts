export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { safeEmail, safeString, safeNumber, safeDate, zodErrorResponse } from "@/lib/validate";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, setTokenCookie } from "@/lib/auth";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  let email: string, password: string;
  try {
    const ip = getClientIP(request);
    const allowed = await checkRateLimit(`login:${ip}`, 5, 60);
    if (!allowed) {
      logger.warn("Rate limit exceeded", { path: "/api/auth/login", ip });
      return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
    }
    ({ email, password } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const householdId = user.householdId || "";
    const token = signToken({ userId: user.id, email: user.email, householdId });
    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    response.cookies.set(setTokenCookie(token));
    return response;
  } catch (e) {
    logger.error("Login error", { error: String(e) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
