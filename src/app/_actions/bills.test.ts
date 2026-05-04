import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBill, updateBill, deleteBill, getBills } from './bills';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    bill: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany /* eslint-disable-line @typescript-eslint/no-explicit-any */: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    }
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Bills Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAuthUser as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).mockResolvedValue({ userId: 'user-1', email: 'test@example.com', householdId: 'hh-1' });
  });

  describe('createBill', () => {
    it('should create bill successfully', async () => {
      const fd = new FormData();
      fd.append('name', 'Rent');
      fd.append('amount', '1500');
      fd.append('dueDay', '1');
      fd.append('categoryId', 'cat-1');
      fd.append('accountId', 'acc-1');

      (prisma.bill.create as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).mockResolvedValue({ id: 'bill-1' });

      const res = await createBill(fd);
      expect(res.success).toBe(true);
      expect(prisma.bill.create).toHaveBeenCalledWith({
        data: {
          name: 'Rent',
          amount: 1500,
          dueDay: 1,
          categoryId: 'cat-1',
          accountId: 'acc-1',
          householdId: 'hh-1'
        },
      });
      expect(revalidatePath).toHaveBeenCalled();
    });
  });

  describe('getBills', () => {
    it('should return bills', async () => {
      (prisma.bill.findMany /* eslint-disable-line @typescript-eslint/no-explicit-any */ as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).mockResolvedValue([{ id: '1' }]);
      const res = await getBills();
      expect(res.success).toBe(true);
      expect(res.data).toEqual([{ id: '1' }]);
    });
  });
});
