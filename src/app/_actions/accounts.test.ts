import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAccount, updateAccountBalance, deleteAccount, getAccounts } from './accounts';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    transaction: {
      updateMany: vi.fn(),
    },
    bill: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Accounts Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAuthUser as any).mockResolvedValue({ userId: 'user-1', email: 'test@example.com', householdId: 'hh-1' });
  });

  describe('createAccount', () => {
    it('should return unauthorized if no user', async () => {
      (getAuthUser as any).mockResolvedValue(null);
      const fd = new FormData();
      const res = await createAccount(fd);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Unauthorized');
    });

    it('should create account successfully', async () => {
      const fd = new FormData();
      fd.append('name', 'Checking');
      fd.append('type', 'checking');
      fd.append('institution', 'TD');
      fd.append('balance', '1500.50');
      fd.append('color', '#ff0000');

      (prisma.account.create as any).mockResolvedValue({ id: 'acc-1' });

      const res = await createAccount(fd);
      expect(res.success).toBe(true);
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: {
          name: 'Checking',
          type: 'checking',
          institution: 'TD',
          balance: 1500.50,
          color: '#ff0000',
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/accounts');
    });

    it('should handle database errors', async () => {
      const fd = new FormData();
      (prisma.account.create as any).mockRejectedValue(new Error('DB Error'));
      const res = await createAccount(fd);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Failed to create account');
    });
  });

  describe('updateAccountBalance', () => {
    it('should return unauthorized if no user', async () => {
      (getAuthUser as any).mockResolvedValue(null);
      const res = await updateAccountBalance('acc-1', 2000);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Unauthorized');
    });

    it('should update balance successfully', async () => {
      (prisma.account.update as any).mockResolvedValue({});
      const res = await updateAccountBalance('acc-1', 2000);
      expect(res.success).toBe(true);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: 2000 },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/accounts');
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should handle database errors', async () => {
      (prisma.account.update as any).mockRejectedValue(new Error('DB Error'));
      const res = await updateAccountBalance('acc-1', 2000);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Failed to update balance');
    });
  });

  describe('deleteAccount', () => {
    it('should return unauthorized if no user', async () => {
      (getAuthUser as any).mockResolvedValue(null);
      const res = await deleteAccount('acc-1');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Unauthorized');
    });

    it('should delete account successfully in a transaction', async () => {
      (prisma.$transaction as any).mockResolvedValue([]);
      const res = await deleteAccount('acc-1');
      expect(res.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/accounts');
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should handle database errors', async () => {
      (prisma.$transaction as any).mockRejectedValue(new Error('DB Error'));
      const res = await deleteAccount('acc-1');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Failed to delete account');
    });
  });

  describe('getAccounts', () => {
    it('should return accounts list', async () => {
      const mockAccounts = [{ id: '1', name: 'Check' }];
      (prisma.account.findMany as any).mockResolvedValue(mockAccounts);
      
      const res = await getAccounts();
      expect(res).toEqual(mockAccounts);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});
