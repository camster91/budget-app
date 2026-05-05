"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { isTransfer } from "@/lib/utils/transactionUtils";
import { categorizeTransaction } from "@/lib/categorization/rulesEngine";

export async function getTransactions() {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const transactions = await prisma.transaction.findMany({
            where: { householdId: user.householdId },
            orderBy: {
                date: "desc",
            },
            include: {
                category: true,
            },
        });
        return { success: true, data: transactions };
    } catch (error) {
        console.error("Failed to fetch transactions:", error);
        return { success: false, error: "Failed to fetch transactions" };
    }
}

export async function createTransaction(formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const amount = parseFloat(formData.get("amount") as string);
        const description = formData.get("description") as string;
        const date = new Date(formData.get("date") as string);
        const type = formData.get("type") as string;
        const isDiscretionary = (formData.get("isDiscretionary") as string) !== "false";
        const categoryName = formData.get("category") as string;

        if (!amount || !description || !date || !type) {
            return { success: false, error: "Missing required fields" };
        }

        let categoryId = formData.get("categoryId") as string;

        // Auto-categorization
        if (!categoryId) {
            const categories = await prisma.category.findMany({ where: { householdId: user.householdId }});
            categoryId = categorizeTransaction(description, categories) || "";
        }

        if (!categoryId && categoryName) {
            const existing = await prisma.category.findFirst({
                where: { name: categoryName, householdId: user.householdId }
            });
            if (existing) {
                categoryId = existing.id;
            } else {
                const category = await prisma.category.create({
                    data: { name: categoryName, type, householdId: user.householdId },
                });
                categoryId = category.id;
            }
        }

        await prisma.transaction.create({
            data: {
                amount,
                description,
                date,
                type,
                categoryId: categoryId || null,
                isTransfer: isTransfer(description),
                isDiscretionary: type === "income" ? false : isDiscretionary,
                householdId: user.householdId,
            },
        });

        revalidatePath("/transactions");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to create transaction:", error);
        return { success: false, error: "Failed to create transaction" };
    }
}


export async function updateTransaction(id: string, formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const amount = parseFloat(formData.get("amount") as string);
        const description = formData.get("description") as string;
        const date = new Date(formData.get("date") as string);
        const type = formData.get("type") as string;
        const categoryId = formData.get("categoryId") as string;

        await prisma.transaction.update({
            where: { id, householdId: user.householdId },
            data: {
                amount,
                description,
                date,
                type,
                categoryId: categoryId || null,
            },
        });

        revalidatePath("/transactions");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update transaction" };
    }
}

export async function deleteTransaction(id: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        await prisma.transaction.delete({
            where: { id, householdId: user.householdId }
        });
        revalidatePath("/transactions");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete" };
    }
}
