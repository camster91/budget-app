"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";
import { createWishlistItemSchema, validateFormData } from "@/lib/validation";
import { toCents } from "@/lib/utils";
import { getDailySnapshot } from "./daily";

export async function getWishlistData() {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const items = await prisma.wishlistItem.findMany({
            where: { householdId: user.householdId },
            orderBy: { createdAt: "desc" },
        });

        const goals = await prisma.goal.findMany({
            where: { householdId: user.householdId },
            orderBy: { createdAt: "desc" },
        });

        const snapshot = await getDailySnapshot();
        const metrics = snapshot.success && snapshot.data ? snapshot.data : {
            dailyAllowance: 0,
            avgDailySpend: 0,
            accumulatedSurplus: 0,
            pace: { percent: 100 },
        };

        const dailyAllowance = metrics.dailyAllowance;
        const avgDailySpend = metrics.avgDailySpend || 0;
        const accumulatedSurplus = metrics.accumulatedSurplus;
        const currentPacePercent = metrics.pace?.percent ?? 100;

        // Daily surplus accumulation rate (in cents)
        const dailySurplusRate = Math.max(0, dailyAllowance - avgDailySpend);

        return {
            success: true,
            items,
            goals,
            metrics: {
                dailyAllowance,
                avgDailySpend,
                accumulatedSurplus,
                dailySurplusRate,
                currentPacePercent,
            },
        };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to load wishlist data" };
    }
}

export async function createWishlistItem(formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validated = validateFormData(formData, createWishlistItemSchema);
    if (!validated.success) return { success: false, error: validated.error };

    const { name, price, link, priority } = validated.data;

    try {
        await prisma.wishlistItem.create({
            data: {
                name,
                price: toCents(price),
                link: link || null,
                priority,
                householdId: user.householdId,
            },
        });

        revalidatePath("/wishlist");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to create wishlist item" };
    }
}

export async function deleteWishlistItem(id: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        await prisma.wishlistItem.delete({
            where: { id, householdId: user.householdId },
        });

        revalidatePath("/wishlist");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to delete wishlist item" };
    }
}

export async function purchaseWishlistItem(
    wishlistId: string,
    useEmergencyFunds: boolean,
    targetGoalId?: string
) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const item = await prisma.wishlistItem.findUnique({
            where: { id: wishlistId, householdId: user.householdId },
        });
        if (!item) return { success: false, error: "Wishlist item not found" };

        if (useEmergencyFunds && targetGoalId) {
            const goal = await prisma.goal.findUnique({
                where: { id: targetGoalId, householdId: user.householdId },
            });
            if (!goal) return { success: false, error: "Target savings goal not found" };

            // 1. Deduct funds from target goal (clamp at 0)
            const newAmount = Math.max(0, goal.currentAmount - item.price);
            await prisma.goal.update({
                where: { id: targetGoalId },
                data: { currentAmount: newAmount },
            });

            // 2. Create history transaction
            await prisma.transaction.create({
                data: {
                    amount: item.price,
                    description: `Wishlist (Emergency Savings: ${goal.name}): ${item.name}`,
                    type: "expense",
                    date: new Date(),
                    isTransfer: false,
                    isDuplicate: false,
                    householdId: user.householdId,
                },
            });
        } else {
            // Create regular transaction
            await prisma.transaction.create({
                data: {
                    amount: item.price,
                    description: `Wishlist Purchase: ${item.name}`,
                    type: "expense",
                    date: new Date(),
                    isTransfer: false,
                    isDuplicate: false,
                    householdId: user.householdId,
                },
            });
        }

        // Mark item as purchased
        await prisma.wishlistItem.update({
            where: { id: wishlistId },
            data: { purchased: true },
        });

        revalidatePath("/wishlist");
        revalidatePath("/goals");
        revalidatePath("/daily");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Purchase failed" };
    }
}
