import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";
import { NextRequest } from "next/server";

const HERMES_KEY = process.env.HERMES_API_KEY;

export function verifyHermesAuth(request: NextRequest): { ok: true; householdId: string } | { ok: false; error: string } {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return { ok: false, error: "Missing or invalid Authorization header" };
  }
  const token = auth.slice(7);
  if (!HERMES_KEY || token !== HERMES_KEY) {
    return { ok: false, error: "Invalid API key" };
  }
  // Single-household app — Budget Tracker uses one household per install.
  // Fetch the first household; fall back to creating one on first boot if empty.
  return { ok: true, householdId: "" }; // resolved lazily in handlers
}

export async function getHouseholdId() {
  const user = await getAuthUser();
  if (user) return user.householdId;
  const household = await prisma.household.findFirst({ orderBy: { createdAt: "asc" } });
  if (household) return household.id;
  const newHousehold = await prisma.household.create({ data: { name: "Default" } });
  return newHousehold.id;
}
