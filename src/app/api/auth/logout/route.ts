export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { safeEmail, safeString, safeNumber, safeDate, zodErrorResponse } from "@/lib/validate";
import { logger } from "@/lib/logger";
import { clearTokenCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(clearTokenCookie());
  return response;
}
