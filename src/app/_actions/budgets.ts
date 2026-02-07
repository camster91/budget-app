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
        // Calculate progress for each budget
        // This requires aggregation of transactions.
        // For MVP, simplistic fetch.
        return { success: true, data: budgets };
    } catch (error) {
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
