export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const start = Date.now();
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    const responseTimeMs = Date.now() - start;

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "budget-app",
        version: process.env.npm_package_version || "0.1.0",
        responseTimeMs,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        service: "budget-app",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}