"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getBudgets() {
    try {
        const budgets = await prisma.budget.findMany({
            include: {
                category: true,
            },
        });

        // Enrich budgets with spending data
        const enrichedBudgets = await Promise.all(budgets.map(async (budget: any) => {
            const startDate = new Date(budget.period + "-01");
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

            const transactions = await prisma.transaction.aggregate({
                where: {
                    categoryId: budget.categoryId,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    type: "expense",
                },
                _sum: {
                    amount: true,
                },
            });

            const spent = transactions._sum.amount || 0;
            const progress = (spent / budget.amount) * 100;

            return {
                ...budget,
                spent,
                progress,
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
    try {
        const amount = parseFloat(formData.get("amount") as string);
        const categoryName = formData.get("category") as string;
        const period = new Date().toISOString().slice(0, 7); // "YYYY-MM"

        if (!amount || !categoryName) {
            return { success: false, error: "Missing required fields" };
        }

        // Find or create category
        const category = await prisma.category.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName, type: "expense" },
        });

        await prisma.budget.upsert({
            where: {
                categoryId_period: {
                    categoryId: category.id,
                    period: period,
                }
            },
            update: { amount },
            create: {
                amount,
                period,
                categoryId: category.id,
            }
        });

        revalidatePath("/budgets");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to create budget:", error);
        return { success: false, error: "Failed to create budget" };
    }
}
