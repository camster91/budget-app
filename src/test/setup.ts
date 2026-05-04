import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Force UTC for tests
process.env.TZ = 'UTC';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Mock Next.js modules
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    income: {
      findMany: vi.fn(),
    },
    bill: {
      findMany: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
    user: {
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));
