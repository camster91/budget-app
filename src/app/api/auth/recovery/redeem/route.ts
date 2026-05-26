import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, setTokenCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let email: string, code: string;
    try {
      ({ email, code } = await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.recoveryCodes) {
      return NextResponse.json({ error: "Invalid email or code" }, { status: 400 });
    }

    const hashedCodes: string[] = JSON.parse(user.recoveryCodes);
    let matchIndex = -1;
    for (let i = 0; i < hashedCodes.length; i++) {
      if (await verifyPassword(code, hashedCodes[i])) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex === -1) {
      return NextResponse.json({ error: "Invalid recovery code" }, { status: 400 });
    }

    // Remove used code
    hashedCodes.splice(matchIndex, 1);
    await prisma.user.update({
      where: { id: user.id },
      data: { recoveryCodes: hashedCodes.length > 0 ? JSON.stringify(hashedCodes) : null },
    });

    // Generate JWT and log user in
    const token = signToken({
      userId: user.id,
      email: user.email,
      householdId: user.householdId,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(setTokenCookie(token));
    return response;
  } catch (error) {
    console.error("Recovery redeem error:", error);
    return NextResponse.json({ error: "Failed to redeem recovery code" }, { status: 500 });
  }
}
