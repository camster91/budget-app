"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";
import { toCents } from "@/lib/utils";
import { createIncomeSchema, updateIncomeSchema, validateFormData } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function getIncomes() {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const incomes = await prisma.income.findMany({ 
            where: { householdId: user.householdId },
            orderBy: { createdAt: "desc" } 
        });
        return { success: true, data: incomes };
    } catch (error) {
        return { success: false, error: "Failed to fetch incomes" };
    }
}

export async function createIncome(formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validated = validateFormData(formData, createIncomeSchema);
    if (!validated.success) return { success: false, error: validated.error };

    const { name, amount, frequency, startDate, dayOfMonth } = validated.data;

    try {
        const income = await prisma.income.create({
            data: { 
                name, 
                amount: toCents(amount), 
                frequency, 
                startDate, 
                dayOfMonth: dayOfMonth || null,
                householdId: user.householdId,
            },
        });

        revalidatePath("/daily");
        revalidatePath("/settings");
        return { success: true, data: income };
    } catch (error) {
        console.error("Income create error:", error);
        return { success: false, error: "Failed to create income" };
    }
}

export async function updateIncome(id: string, formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validated = validateFormData(formData, updateIncomeSchema);
    if (!validated.success) return { success: false, error: validated.error };

    const { name, amount, frequency, startDate, dayOfMonth, isActive } = validated.data;

    try {
        const income = await prisma.income.update({
            where: { id, householdId: user.householdId },
            data: { 
                name, 
                amount: toCents(amount), 
                frequency, 
                startDate, 
                dayOfMonth: dayOfMonth || null, 
                isActive: isActive ?? true 
            },
        });

        revalidatePath("/daily");
        revalidatePath("/settings");
        return { success: true, data: income };
    } catch (error) {
        return { success: false, error: "Failed to update income" };
    }
}

export async function deleteIncome(id: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        await prisma.income.delete({ where: { id, householdId: user.householdId } });
        revalidatePath("/daily");
        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete" };
    }
}
