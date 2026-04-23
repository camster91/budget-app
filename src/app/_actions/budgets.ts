"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function getBudgets(period?: string) {
    const targetPeriod = period || new Date().toISOString().slice(0, 7);
    try {
        const budgets = await prisma.budget.findMany({
            where: { period: targetPeriod },
            include: { category: true },
            orderBy: { createdAt: "desc" },
        });

        const enrichedBudgets = await Promise.all(budgets.map(async (budget) => {
            const startDate = new Date(budget.period + "-01");
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

            const agg = await prisma.transaction.aggregate({
                where: {
                    categoryId: budget.categoryId,
                    date: { gte: startDate, lte: endDate },
                    type: "expense",
                },
                _sum: { amount: true },
            });

            const spent = agg._sum.amount || 0;
            return {
                ...budget,
                spent,
                progress: (spent / budget.amount) * 100,
                remaining: budget.amount - spent,
            };
        }));

        return { success: true, data: enrichedBudgets };
    } catch (error) {
        console.error("Failed to fetch budgets:", error);
        return { success: false, error: "Failed to fetch budgets" };
    }
}

export async function createBudget(formData: FormData) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        const amount = parseFloat(formData.get("amount") as string);
        const categoryId = formData.get("categoryId") as string;
        const categoryName = formData.get("category") as string;
        const period = (formData.get("period") as string) || new Date().toISOString().slice(0, 7);

        if (!amount || (!categoryId && !categoryName)) {
            return { success: false, error: "Missing required fields" };
        }

        let resolvedCategoryId = categoryId;
        if (!resolvedCategoryId && categoryName) {
            const category = await prisma.category.upsert({
                where: { name: categoryName },
                update: {},
                create: { name: categoryName, type: "expense" },
            });
            resolvedCategoryId = category.id;
        }

        await prisma.budget.upsert({
            where: { categoryId_period: { categoryId: resolvedCategoryId, period } },
            update: { amount },
            create: { amount, period, categoryId: resolvedCategoryId },
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
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        await prisma.budget.delete({ where: { id } });
        revalidatePath("/budgets");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete budget" };
    }
}
