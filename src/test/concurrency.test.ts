import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Mock Next.js and Auth
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { purchaseWishlistItem } from '@/app/_actions/wishlist';
import { addQuickSpend } from '@/app/_actions/daily';

describe('Concurrency Tests - The Concurrency Couple', () => {
  const householdId = 'concurrency-hh-1';

  beforeAll(async () => {
    // Create household if not exists
    await prisma.household.upsert({
      where: { id: householdId },
      update: {},
      create: { id: householdId, name: 'Concurrency Couple HH' },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.transaction.deleteMany({ where: { householdId } });
    await prisma.wishlistItem.deleteMany({ where: { householdId } });
    await prisma.goal.deleteMany({ where: { householdId } });
    await prisma.household.deleteMany({ where: { id: householdId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    (getAuthUser as any).mockResolvedValue({ 
      userId: 'user-1', 
      email: 'couple@example.com', 
      householdId 
    });

    await prisma.transaction.deleteMany({ where: { householdId } });
    await prisma.wishlistItem.deleteMany({ where: { householdId } });
    await prisma.goal.deleteMany({ where: { householdId } });
  });

  it('should demonstrate a race condition in purchaseWishlistItem', async () => {
    // Setup goal and item
    const goal = await prisma.goal.create({
      data: {
        name: 'Emergency Fund',
        targetAmount: 50000,
        currentAmount: 10000, // $100.00
        householdId,
      }
    });

    const item = await prisma.wishlistItem.create({
      data: {
        name: 'New TV',
        price: 5000, // $50.00
        priority: 'high',
        householdId,
        purchased: false,
      }
    });

    // Fire two requests concurrently at the EXACT same time
    const [res1, res2] = await Promise.all([
      purchaseWishlistItem(item.id, true, goal.id),
      purchaseWishlistItem(item.id, true, goal.id)
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true); // Both succeed!

    // Let's check the database invariants
    const updatedGoal = await prisma.goal.findUnique({ where: { id: goal.id } });
    const transactions = await prisma.transaction.findMany({ where: { householdId } });

    console.log("=== Race Condition Results: purchaseWishlistItem ===");
    console.log(`Initial Goal Amount: $100.00`);
    console.log(`Item Price: $50.00`);
    console.log(`Expected Goal Amount: $50.00`);
    console.log(`Actual Goal Amount: $${(updatedGoal?.currentAmount ?? 0) / 100}`);
    console.log(`Transactions Created: ${transactions.length}`);

    // If it's a true race condition, we spent $100 (2 transactions) but the goal only went down by $50
  });

  it('should demonstrate a double-spend in addQuickSpend', async () => {
    const formData1 = new FormData();
    formData1.append('amount', '25.00');
    formData1.append('description', 'Uber Ride');

    const formData2 = new FormData();
    formData2.append('amount', '25.00');
    formData2.append('description', 'Uber Ride');

    // Fire two identical quick spends at the exact same millisecond
    const [res1, res2] = await Promise.all([
      addQuickSpend(formData1),
      addQuickSpend(formData2)
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);

    const transactions = await prisma.transaction.findMany({ 
      where: { householdId },
      orderBy: { createdAt: 'asc' }
    });

    console.log("=== Race Condition Results: addQuickSpend ===");
    console.log(`Transactions Created: ${transactions.length}`);
    transactions.forEach((tx, i) => {
      console.log(`Tx ${i+1}: $${tx.amount / 100} - duplicate? ${tx.isDuplicate}`);
    });

    // We expect both to have isDuplicate = false because they both read the DB before either writes!
  });
});
