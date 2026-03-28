"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createAccount(formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const type = formData.get("type") as string;
        const institution = formData.get("institution") as string;
        const balance = parseFloat(formData.get("balance") as string || "0");
        const color = formData.get("color") as string;

        await prisma.account.create({
            data: { name, type, institution: institution || null, balance, color: color || null },
        });
        revalidatePath("/accounts");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to create account" };
    }
}

export async function updateAccountBalance(id: string, balance: number) {
    try {
        await prisma.account.update({ where: { id }, data: { balance } });
        revalidatePath("/accounts");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update balance" };
    }
}

export async function deleteAccount(id: string) {
    try {
        await prisma.account.delete({ where: { id } });
        revalidatePath("/accounts");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete account" };
    }
}

export async function getAccounts() {
    return await prisma.account.findMany({ orderBy: { createdAt: "asc" } });
}
