"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { isTransfer } from "@/lib/utils/transactionUtils";
import { categorizeTransaction } from "@/lib/categorization/rulesEngine";
import { createTransactionSchema, updateTransactionSchema, validateFormData } from "@/lib/validation";
import { toCents } from "@/lib/utils";

export async function getTransactions(dateFrom?: string, dateTo?: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const where: Record<string, unknown> = { householdId: user.householdId };
        if (dateFrom) {
            where.date = { ...(where.date as object || {}), gte: new Date(dateFrom) };
        }
        if (dateTo) {
            where.date = { ...(where.date as object || {}), lte: new Date(dateTo + "T23:59:59") };
        }
        const transactions = await prisma.transaction.findMany({
            where,
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

    const validated = validateFormData(formData, createTransactionSchema);
    if (!validated.success) return { success: false, error: validated.error };

    const { amount, description, date, type, isDiscretionary, categoryId, categoryName } = validated.data;

    try {
        let resolvedCategoryId = categoryId;

        // Auto-categorization
        if (!resolvedCategoryId) {
            const categories = await prisma.category.findMany({ where: { householdId: user.householdId } });
            resolvedCategoryId = categorizeTransaction(description, categories) || "";
        }

        if (!resolvedCategoryId && categoryName) {
            const existing = await prisma.category.findFirst({
                where: { name: categoryName, householdId: user.householdId }
            });
            if (existing) {
                resolvedCategoryId = existing.id;
            } else {
                const category = await prisma.category.create({
                    data: { name: categoryName, type, householdId: user.householdId },
                });
                resolvedCategoryId = category.id;
            }
        }

        await prisma.transaction.create({
            data: {
                amount: toCents(amount),
                description,
                date,
                type,
                categoryId: resolvedCategoryId || null,
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

    const validated = validateFormData(formData, updateTransactionSchema);
    if (!validated.success) return { success: false, error: validated.error };

    const { amount, description, date, type, categoryId, isDiscretionary } = validated.data;

    try {
        await prisma.transaction.update({
            where: { id, householdId: user.householdId },
            data: {
                amount: toCents(amount),
                description,
                date,
                type,
                categoryId: categoryId || null,
                isTransfer: isTransfer(description),
                ...(isDiscretionary !== undefined && { isDiscretionary }),
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
