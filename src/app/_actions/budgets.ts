"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { createBudgetSchema, validateFormData } from "@/lib/validation";
import { toCents } from "@/lib/utils";

export async function getBudgets(period?: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    const targetPeriod = period || new Date().toISOString().slice(0, 7);
    try {
        const budgets = await prisma.budget.findMany({
            where: { period: targetPeriod, householdId: user.householdId },
            include: { category: true },
            orderBy: { createdAt: "desc" },
        });

        // Calculate previous period for rollover
        const [year, month] = targetPeriod.split("-").map(Number);
        const prevPeriod = new Date(year, month - 2, 1).toISOString().slice(0, 7);

        const prevBudgets = await prisma.budget.findMany({
            where: { period: prevPeriod, householdId: user.householdId },
            include: { category: true },
        });

        const prevStartDate = new Date(prevPeriod + "-01");
        const prevEndDate = new Date(prevStartDate.getFullYear(), prevStartDate.getMonth() + 1, 0);
        const prevCategoryIds = prevBudgets.map((b) => b.categoryId).filter(Boolean) as string[];

        const prevSpendAgg = prevCategoryIds.length > 0
            ? await prisma.transaction.groupBy({
                  by: ["categoryId"],
                  where: {
                      categoryId: { in: prevCategoryIds },
                      date: { gte: prevStartDate, lte: prevEndDate },
                      type: "expense",
                      householdId: user.householdId,
                  },
                  _sum: { amount: true },
              })
            : [];

        const prevSpentByCategory = new Map(prevSpendAgg.map((s) => [s.categoryId, s._sum.amount || 0]));

        // Calculate rolled-over amounts per category
        const rolloverByCategory = new Map<string, number>();
        for (const pb of prevBudgets) {
            if (pb.carryover) {
                const spent = prevSpentByCategory.get(pb.categoryId) || 0;
                const leftover = pb.amount - spent;
                rolloverByCategory.set(pb.categoryId, leftover > 0 ? leftover : 0);
            }
        }

        const startDate = new Date(targetPeriod + "-01");
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        const categoryIds = budgets.map((b) => b.categoryId).filter(Boolean) as string[];

        const spendAgg = categoryIds.length > 0
            ? await prisma.transaction.groupBy({
                  by: ["categoryId"],
                  where: {
                      categoryId: { in: categoryIds },
                      date: { gte: startDate, lte: endDate },
                      type: "expense",
                      householdId: user.householdId,
                  },
                  _sum: { amount: true },
              })
            : [];

        const spentByCategory = new Map(spendAgg.map((s) => [s.categoryId, s._sum.amount || 0]));

        const enrichedBudgets = budgets.map((budget) => {
            const spent = spentByCategory.get(budget.categoryId) || 0;
            const startingAmount = rolloverByCategory.get(budget.categoryId) || 0;
            const effectiveAmount = budget.amount + startingAmount;
            const remaining = effectiveAmount - spent;
            return {
                ...budget,
                spent,
                startingAmount,
                effectiveAmount,
                progress: effectiveAmount > 0 ? (spent / effectiveAmount) * 100 : 0,
                remaining: remaining > 0 ? remaining : 0,
                overspent: remaining < 0 ? Math.abs(remaining) : 0,
            };
        });

        return { success: true, data: enrichedBudgets };
    } catch (error) {
        console.error("Failed to fetch budgets:", error);
        return { success: false, error: "Failed to fetch budgets" };
    }
}

export async function createBudget(formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validated = validateFormData(formData, createBudgetSchema);
    if (!validated.success) return { success: false, error: validated.error };

        const { amount, categoryId, category: categoryName, period, carryover } = validated.data;

        try {
            let resolvedCategoryId = categoryId;
            if (!resolvedCategoryId && categoryName) {
                const existing = await prisma.category.findFirst({
                    where: { name: categoryName, householdId: user.householdId }
                });
                if (existing) {
                    resolvedCategoryId = existing.id;
                } else {
                    const category = await prisma.category.create({
                        data: { name: categoryName, type: "expense", householdId: user.householdId },
                    });
                    resolvedCategoryId = category.id;
                }
            }

            await prisma.budget.upsert({
                where: { categoryId_period: { categoryId: resolvedCategoryId!, period } },
                update: { amount: toCents(amount), carryover },
                create: { amount: toCents(amount), period, categoryId: resolvedCategoryId!, carryover, householdId: user.householdId },
            });

        revalidatePath("/budgets");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to create budget:", error);
        return { success: false, error: "Failed to create budget" };
    }
}

export async function deleteBudget(id: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        await prisma.budget.delete({ where: { id, householdId: user.householdId } });
        revalidatePath("/budgets");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete budget" };
    }
}
