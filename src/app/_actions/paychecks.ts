"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getPaycheck() {
    try {
        const paycheck = await prisma.paycheck.findFirst();
        return { success: true, data: paycheck };
    } catch (error) {
        return { success: false, error: "Failed to fetch paycheck" };
    }
}

export async function createOrUpdatePaycheck(formData: FormData) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        const id = formData.get("id") as string;
        const name = (formData.get("name") as string) || "Primary Income";
        const amount = parseFloat(formData.get("amount") as string);
        const frequency = formData.get("frequency") as string;
        const startDate = new Date(formData.get("startDate") as string);
        const dayOfMonth = parseInt(formData.get("dayOfMonth") as string) || null;

        if (!amount || !startDate || !frequency) {
            return { success: false, error: "Amount, frequency and start date required" };
        }

        const data = { name, amount, frequency, startDate, dayOfMonth };

        if (id) {
            await prisma.paycheck.update({
                where: { id },
                data,
            });
        } else {
            // Delete any existing first (we only support one for simplicity)
            await prisma.paycheck.deleteMany();
            await prisma.paycheck.create({ data });
        }

        revalidatePath("/daily");
        revalidatePath("/");
        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Paycheck save error:", error);
        return { success: false, error: "Failed to save paycheck" };
    }
}

export async function deletePaycheck(id: string) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        await prisma.paycheck.delete({ where: { id } });
        revalidatePath("/daily");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete" };
    }
}
