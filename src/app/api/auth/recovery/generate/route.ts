import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";
import { hashPassword } from "@/lib/auth";
import { randomBytes } from "crypto";

function generateRecoveryCode(): string {
  return randomBytes(4).toString("hex").toUpperCase(); // 8 chars, e.g. "A1B2C3D4"
}

export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate 10 single-use codes
  const codes: string[] = [];
  const hashedCodes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = generateRecoveryCode();
    codes.push(code);
    hashedCodes.push(await hashPassword(code));
  }

  await prisma.user.update({
    where: { id: user.userId },
    data: { recoveryCodes: JSON.stringify(hashedCodes) },
  });

  return NextResponse.json({ success: true, codes });
}
