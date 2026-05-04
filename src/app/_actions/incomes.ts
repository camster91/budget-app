"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
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
    try {
        const name = (formData.get("name") as string) || "Income";
        const amount = parseFloat(formData.get("amount") as string);
        const frequency = formData.get("frequency") as string;
        const startDate = new Date(formData.get("startDate") as string);
        const dayOfMonth = parseInt(formData.get("dayOfMonth") as string) || null;

        if (!amount || !startDate || !frequency) {
            return { success: false, error: "Amount, frequency and start date required" };
        }

        const income = await prisma.income.create({
            data: { 
                name, 
                amount, 
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
    try {
        const name = (formData.get("name") as string) || "Income";
        const amount = parseFloat(formData.get("amount") as string);
        const frequency = formData.get("frequency") as string;
        const startDate = new Date(formData.get("startDate") as string);
        const dayOfMonth = parseInt(formData.get("dayOfMonth") as string) || null;
        const isActive = formData.get("isActive") === "true";

        const income = await prisma.income.update({
            where: { id, householdId: user.householdId },
            data: { name, amount, frequency, startDate, dayOfMonth: dayOfMonth || null, isActive },
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
