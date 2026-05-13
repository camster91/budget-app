import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBill, updateBill, deleteBill } from './bills';
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
      findMany  : vi.fn(),
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
      fd.append('categoryId', '550e8400-e29b-41d4-a716-446655440000');
      fd.append('accountId', '660e8400-e29b-41d4-a716-446655440001');

      (prisma.bill.create as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).mockResolvedValue({ id: 'bill-1' });

      const res = await createBill(fd);
      expect(res.success).toBe(true);
      expect(prisma.bill.create).toHaveBeenCalledWith({
        data: {
          name: 'Rent',
          amount: 150000,
          dueDay: 1,
          categoryId: '550e8400-e29b-41d4-a716-446655440000',
          accountId: '660e8400-e29b-41d4-a716-446655440001',
          householdId: 'hh-1'
        },
      });
      expect(revalidatePath).toHaveBeenCalled();
    });

    it('should reject invalid input', async () => {
      const fd = new FormData();
      fd.append('name', '');
      fd.append('amount', '-50');
      fd.append('dueDay', '45');
      const res = await createBill(fd);
      expect(res.success).toBe(false);
      expect(res.error).toContain('name');
    });
  });

});
