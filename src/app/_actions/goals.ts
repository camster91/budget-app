"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { createGoalSchema, updateGoalSchema, validateFormData } from "@/lib/validation";
import { toCents } from "@/lib/utils";

export async function createGoal(formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validated = validateFormData(formData, createGoalSchema);
    if (!validated.success) return { success: false, error: validated.error };

    const { name, targetAmount, currentAmount, categoryId, targetDate } = validated.data;

    try {
        await prisma.goal.create({
            data: { 
                name, 
                targetAmount: toCents(targetAmount), 
                currentAmount: toCents(currentAmount), 
                categoryId,
                targetDate: targetDate ?? null,
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

    const validated = validateFormData(formData, updateGoalSchema);
    if (!validated.success) return { success: false, error: validated.error };

    const { name, targetAmount, currentAmount, categoryId, targetDate } = validated.data;

    try {
        await prisma.goal.update({
            where: { id, householdId: user.householdId },
            data: {
                name,
                targetAmount: toCents(targetAmount),
                currentAmount: toCents(currentAmount),
                categoryId: categoryId ?? null,
                targetDate: targetDate ?? null,
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
