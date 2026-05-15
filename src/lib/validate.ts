import { NextResponse } from "next/server";

export function zodErrorResponse(error: any) {
  return NextResponse.json(
    { error: "Invalid input", details: error.errors || error.message },
    { status: 400 }
  );
}

export function safeEmail(str: string): string | null {
  str = String(str || "").trim();
  if (!str.includes("@") || !str.includes(".")) return null;
  if (str.length > 254) return null;
  return str.toLowerCase();
}

export function safeString(str: string, maxLen = 200): string | null {
  str = String(str || "").trim();
  if (!str) return null;
  if (str.length > maxLen) return null;
  return str;
}

export function safeNumber(n: number, min = -1e9, max = 1e9): number | null {
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  if (n < min || n > max) return null;
  return Math.round(n * 100) / 100; // 2 decimal places
}

export function safeDate(str: string): Date | null {
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const year1900 = new Date("1900-01-01");
  if (d < year1900 || d > now) return null;
  return d;
}
