"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function createGoal(formData: FormData) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
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

export async function updateGoal(id: string, formData: FormData) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        const name = formData.get("name") as string;
        const targetAmount = parseFloat(formData.get("targetAmount") as string);
        const currentAmount = parseFloat(formData.get("currentAmount") as string);
        const categoryId = (formData.get("categoryId") as string) || null;
        const targetDateStr = formData.get("targetDate") as string;

        await prisma.goal.update({
            where: { id },
            data: {
                name,
                targetAmount,
                currentAmount,
                categoryId,
                targetDate: targetDateStr ? new Date(targetDateStr) : null,
            },
        });
        revalidatePath("/goals");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update goal" };
    }
}

export async function deleteGoal(id: string) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        await prisma.goal.delete({ where: { id } });
        revalidatePath("/goals");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete goal" };
    }
}
