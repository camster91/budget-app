"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function createGoal(formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
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
                targetDate: targetDateStr ? new Date(targetDateStr) : null,
                householdId: user.householdId,
            },
        });
        revalidatePath("/goals");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to create goal" };
    }
}

export async function updateGoal(id: string, formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const name = formData.get("name") as string;
        const targetAmount = parseFloat(formData.get("targetAmount") as string);
        const currentAmount = parseFloat(formData.get("currentAmount") as string);
        const categoryId = (formData.get("categoryId") as string) || null;
        const targetDateStr = formData.get("targetDate") as string;

        await prisma.goal.update({
            where: { id, householdId: user.householdId },
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
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        await prisma.goal.delete({ where: { id, householdId: user.householdId } });
        revalidatePath("/goals");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete goal" };
    }
}
