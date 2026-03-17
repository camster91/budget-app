"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createBill(formData: FormData) {
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
