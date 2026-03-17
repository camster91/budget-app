"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createGoal(formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const targetAmount = parseFloat(formData.get("targetAmount") as string);
        const currentAmount = parseFloat(formData.get("currentAmount") as string || "0");
        const categoryId = formData.get("categoryId") as string;
        const targetDateStr = formData.get("targetDate") as string;

        await prisma.goal.create({
            data: { 
                name, 
                targetAmount, 
                currentAmount, 
                categoryId,
                targetDate: targetDateStr ? new Date(targetDateStr) : null
            },
        });
        revalidatePath("/goals");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to create goal" };
    }
}

export async function updateGoal(id: string, currentAmount: number) {
    try {
        await prisma.goal.update({
            where: { id },
            data: { currentAmount },
        });
        revalidatePath("/goals");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update goal" };
    }
}
