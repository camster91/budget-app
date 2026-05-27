import { describe, it, expect, vi, beforeEach } from "vitest";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { purchaseWishlistItem } from '@/app/_actions/wishlist';
import { addQuickSpend } from '@/app/_actions/daily';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/getAuthUser';

// Mock auth
vi.mock('@/lib/getAuthUser', () => ({
  getAuthUser: vi.fn(),
}));

describe('The Impulsive Spender Loopholes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAuthUser as any).mockResolvedValue({ userId: 'user1', householdId: 'house1' });
    
    // Ensure missing mocks exist
    if (!prisma.transaction.create) prisma.transaction.create = vi.fn();
    if (!prisma.transaction.findFirst) prisma.transaction.findFirst = vi.fn();
    if (!prisma.transaction.delete) prisma.transaction.delete = vi.fn();
  });

  it('bypasses the 48-hour cooling-off period on wishlist items', async () => {
    // Setup a newly created wishlist item (created just now)
    const now = new Date();
    (prisma.wishlistItem.findUnique as any).mockResolvedValue({
      id: 'item1',
      name: 'Shiny New Toy',
      price: 50000,
      householdId: 'house1',
      createdAt: now, // created exactly now, NO cooling off period
    });

    (prisma.transaction.create as any).mockResolvedValue({ id: 'tx1' });
    (prisma.wishlistItem.update as any).mockResolvedValue({});

    // Purchase immediately
    const result = await purchaseWishlistItem('item1', false);

    // It should succeed without any error about 48 hours
    expect(result).toEqual({ success: true });
    expect(prisma.transaction.create).toHaveBeenCalled();
  });

  it('drains emergency savings goals even if the balance is low', async () => {
    // Setup a wishlist item that costs $500 (50000 cents)
    (prisma.wishlistItem.findUnique as any).mockResolvedValue({
      id: 'item2',
      name: 'Expensive Emergency',
      price: 50000,
      householdId: 'house1',
    });

    // Setup a goal that only has $50 (5000 cents)
    (prisma.goal.findUnique as any).mockResolvedValue({
      id: 'goal1',
      name: 'Emergency Fund',
      currentAmount: 5000,
      householdId: 'house1',
    });

    (prisma.goal.update as any).mockResolvedValue({});
    (prisma.transaction.create as any).mockResolvedValue({});
    (prisma.wishlistItem.update as any).mockResolvedValue({});

    const result = await purchaseWishlistItem('item2', true, 'goal1');

    // Should succeed and clamp goal amount to 0, granting the rest for free
    expect(result).toEqual({ success: true });
    expect(prisma.goal.update).toHaveBeenCalledWith({
      where: { id: 'goal1' },
      data: { currentAmount: 0 }, // Drained to 0, $450 conjured from thin air
    });
  });

  it('overdrafts the 80/20 Discretionary Surplus vault', async () => {
    // You can just add a quick spend of $1000 without any surplus checks
    const formData = new FormData();
    formData.append('amount', '1000');
    formData.append('description', 'YOLO');

    (prisma.transaction.findFirst as any).mockResolvedValue(null);
    (prisma.transaction.create as any).mockResolvedValue({ id: 'tx2' });

    const result = await addQuickSpend(formData);

    // Should succeed without checking available surplus or vault status
    expect(result.success).toBe(true);
    expect(prisma.transaction.create).toHaveBeenCalled();
  });
});
