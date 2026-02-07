"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getTransactions() {
    try {
        const transactions = await prisma.transaction.findMany({
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
    try {
        const amount = parseFloat(formData.get("amount") as string);
        const description = formData.get("description") as string;
        const date = new Date(formData.get("date") as string);
        const type = formData.get("type") as string;
        const categoryName = formData.get("category") as string;

        if (!amount || !description || !date || !type) {
            return { success: false, error: "Missing required fields" };
        }

        // specific logic: simple category handling (find or create)
        // For MVP, we might just use text or a fixed set.
        // Let's assume we pass categoryId if it exists, or name.

        // For now, let's just create a category if it doesn't exist
        let categoryId = formData.get("categoryId") as string;

        if (!categoryId && categoryName) {
            const category = await prisma.category.upsert({
                where: { name: categoryName },
                update: {},
                create: { name: categoryName, type },
            });
            categoryId = category.id;
        }

        await prisma.transaction.create({
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
        console.error("Failed to create transaction:", error);
        return { success: false, error: "Failed to create transaction" };
    }
}

export async function deleteTransaction(id: string) {
    try {
        await prisma.transaction.delete({
            where: { id }
        });
        revalidatePath("/transactions");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete" };
    }
}
