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
            return {
                ...budget,
                spent,
                progress: (spent / budget.amount) * 100,
                remaining: budget.amount - spent,
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

    const { amount, categoryId, category: categoryName, period } = validated.data;

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
            update: { amount: toCents(amount) },
            create: { amount: toCents(amount), period, categoryId: resolvedCategoryId!, householdId: user.householdId },
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
