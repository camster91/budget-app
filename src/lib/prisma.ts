import { PrismaClient } from "@prisma/client";

// Prisma 7: PrismaClient requires a driver adapter.
// We defer PrismaClient construction until the first method call so the
// Next.js build can run without a live DB connection.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const buildPrisma = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = (globalForPrisma.prisma ??= buildPrisma());
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma ??= buildPrisma();
}
