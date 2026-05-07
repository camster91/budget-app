export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, setTokenCookie } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    if (!checkRateLimit(`register:${ip}`, 3, 60 * 60 * 1000)) { // 3 registrations per hour
      return NextResponse.json({ error: "Too many registration attempts" }, { status: 429 });
    }

    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashed = await hashPassword(password);
    
    // Create household and user in a transaction
    const { user, household } = await prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: { name: `${name || email}'s Household` },
      });

      const user = await tx.user.create({
        data: { 
          email, 
          password: hashed, 
          name,
          householdId: household.id
        },
      });

      return { user, household };
    });

    const token = signToken({ 
      userId: user.id, 
      email: user.email, 
      householdId: user.householdId || ""
    });    const response = NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    );
    response.cookies.set(setTokenCookie(token));
    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
