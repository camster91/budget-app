"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function createBill(formData: FormData) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        const name = formData.get("name") as string;
        const amount = parseFloat(formData.get("amount") as string);
        const dueDay = parseInt(formData.get("dueDay") as string);
        const categoryId = formData.get("categoryId") as string;
        const accountId = formData.get("accountId") as string;

        await prisma.bill.create({
            data: { name, amount, dueDay, categoryId, accountId },
        });
        revalidatePath("/bills");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to create bill" };
    }
}

export async function updateBill(id: string, formData: FormData) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        const name = formData.get("name") as string;
        const amount = parseFloat(formData.get("amount") as string);
        const dueDay = parseInt(formData.get("dueDay") as string);
        const categoryId = formData.get("categoryId") as string;
        const accountId = formData.get("accountId") as string;

        await prisma.bill.update({
            where: { id },
            data: { name, amount, dueDay, categoryId, accountId },
        });
        revalidatePath("/bills");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update bill" };
    }
}

export async function deleteBill(id: string) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        await prisma.bill.delete({ where: { id } });
        revalidatePath("/bills");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete bill" };
    }
}
