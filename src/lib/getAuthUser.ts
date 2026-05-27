"use server";

import { verifyToken, TOKEN_COOKIE } from "./auth";
import type { JwtPayload } from "./auth";

export async function getAuthUser(): Promise<JwtPayload | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
