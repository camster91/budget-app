import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDailySnapshot } from './daily';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

describe('getDailySnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAuthUser as any).mockResolvedValue({ userId: 'user-1', email: 'test@example.com' });
  });

  it('should return error if no income configured', async () => {
    (prisma.income.findMany as any).mockResolvedValue([]);
    
    const result = await getDailySnapshot();
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('No income configured');
  });

  it('should calculate daily allowance correctly', async () => {
    const mockIncome = [
      {
        id: '1',
        name: 'Salary',
        amount: 3000,
        frequency: 'monthly',
        startDate: new Date('2026-05-01T00:00:00Z'),
        dayOfMonth: 1,
        isActive: true,
      }
    ];

    const mockBills = [
      {
        id: '1',
        name: 'Rent',
        amount: 1000,
        dueDay: 1,
        isActive: true,
        category: { name: 'Housing' },
      }
    ];

    (prisma.income.findMany as any).mockResolvedValue(mockIncome);
    (prisma.bill.findMany as any).mockResolvedValue(mockBills);
    (prisma.transaction.findMany as any).mockResolvedValue([]);
    (prisma.transaction.groupBy as any).mockResolvedValue([]);
    (prisma.transaction.count as any).mockResolvedValue(0);
    (prisma.category.findMany as any).mockResolvedValue([]);

    // Mock Date to 2026-05-15
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));

    const result = await getDailySnapshot();

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      // 3000 income - 1000 bills = 2000 available
      // Period is May 1 to June 1 (31 days)
      expect(result.data.period.daysTotal).toBe(31);
      expect(result.data.dailyAllowance).toBeCloseTo(64.516, 2);
      expect(result.data.totalIncome).toBe(3000);
      expect(result.data.upcomingBillsTotal).toBe(1000);
    }
  });
});
