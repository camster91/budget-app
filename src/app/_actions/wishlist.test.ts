import { describe, it, expect, vi, beforeEach } from "vitest";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getWishlistData, createWishlistItem, purchaseWishlistItem } from "./wishlist";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";

vi.mock("@/lib/getAuthUser", () => ({
    getAuthUser: vi.fn(),
}));

describe("Wishlist Server Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getAuthUser as any).mockResolvedValue({
            userId: "user-1",
            householdId: "household-1",
            email: "test@example.com",
        });
    });

    describe("getWishlistData", () => {
        it("should fetch active/purchased wishlist items, goals, and daily metrics", async () => {
            const mockItems = [
                {
                    id: "item-1",
                    name: "Laptop",
                    price: 150000, // $1500
                    link: "https://apple.com",
                    priority: "high",
                    purchased: false,
                    householdId: "household-1",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            const mockGoals = [
                {
                    id: "goal-1",
                    name: "Emergency Fund",
                    targetAmount: 500000,
                    currentAmount: 300000,
                },
            ];

            (prisma.wishlistItem.findMany as any).mockResolvedValue(mockItems);
            (prisma.goal.findMany as any).mockResolvedValue(mockGoals);

            // Mock daily snapshot response
            vi.mock("./daily", () => ({
                getDailySnapshot: vi.fn().mockResolvedValue({
                    success: true,
                    data: {
                        dailyAllowance: 5000, // $50
                        avgDailySpend: 3500, // $35
                        accumulatedSurplus: 15000, // $150
                        pace: { percent: 95 },
                    },
                }),
            }));

            const res = await getWishlistData();

            expect(res.success).toBe(true);
            expect(res.items).toHaveLength(1);
            expect(res.goals).toHaveLength(1);
            expect(res.metrics?.dailySurplusRate).toBe(1500); // 5000 - 3500
            expect(res.metrics?.accumulatedSurplus).toBe(15000);
        });
    });

    describe("createWishlistItem", () => {
        it("should successfully parse and create a wishlist item", async () => {
            const mockCreate = vi.fn().mockResolvedValue({ id: "item-2" });
            (prisma.wishlistItem.create as any) = mockCreate;

            const formData = new FormData();
            formData.set("name", "New Gadget");
            formData.set("price", "299.99");
            formData.set("link", "https://amazon.com");
            formData.set("priority", "medium");

            const res = await createWishlistItem(formData);

            expect(res.success).toBe(true);
            expect(mockCreate).toHaveBeenCalledWith({
                data: {
                    name: "New Gadget",
                    price: 29999, // toCents(299.99)
                    link: "https://amazon.com",
                    priority: "medium",
                    householdId: "household-1",
                },
            });
        });
    });

    describe("purchaseWishlistItem", () => {
        it("should execute standard purchase without goal deductions", async () => {
            const mockFind = vi.fn().mockResolvedValue({
                id: "item-1",
                name: "Laptop",
                price: 150000,
                purchased: false,
            });
            const mockUpdateItem = vi.fn().mockResolvedValue({});
            const mockCreateTx = vi.fn().mockResolvedValue({});

            (prisma.wishlistItem.findUnique as any) = mockFind;
            (prisma.wishlistItem.update as any) = mockUpdateItem;
            (prisma.transaction.create as any) = mockCreateTx;

            const res = await purchaseWishlistItem("item-1", false);

            expect(res.success).toBe(true);
            expect(mockCreateTx).toHaveBeenCalled();
            expect(mockUpdateItem).toHaveBeenCalledWith({
                where: { id: "item-1" },
                data: { purchased: true },
            });
        });

        it("should deduct goal balance when using emergency savings injection", async () => {
            const mockFindItem = vi.fn().mockResolvedValue({
                id: "item-1",
                name: "Emergency Repair",
                price: 50000, // $500
                purchased: false,
            });

            const mockFindGoal = vi.fn().mockResolvedValue({
                id: "goal-1",
                name: "Emergency Fund",
                currentAmount: 100000, // $1000
            });

            const mockUpdateGoal = vi.fn().mockResolvedValue({});
            const mockUpdateItem = vi.fn().mockResolvedValue({});
            const mockCreateTx = vi.fn().mockResolvedValue({});

            (prisma.wishlistItem.findUnique as any) = mockFindItem;
            (prisma.goal.findUnique as any) = mockFindGoal;
            (prisma.goal.update as any) = mockUpdateGoal;
            (prisma.wishlistItem.update as any) = mockUpdateItem;
            (prisma.transaction.create as any) = mockCreateTx;

            const res = await purchaseWishlistItem("item-1", true, "goal-1");

            expect(res.success).toBe(true);
            expect(mockUpdateGoal).toHaveBeenCalledWith({
                where: { id: "goal-1" },
                data: { currentAmount: 50000 }, // 100000 - 50000
            });
            expect(mockCreateTx).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    amount: 50000,
                    description: "Wishlist (Emergency Savings: Emergency Fund): Emergency Repair",
                }),
            });
        });
    });
});
