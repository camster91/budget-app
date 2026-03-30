"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function createAccount(formData: FormData) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
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
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
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
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        await prisma.$transaction([
            // Transactions have nullable accountId — null them out.
            // Bills have required accountId — delete them.
            prisma.transaction.updateMany({ where: { accountId: id }, data: { accountId: null } }),
            prisma.bill.deleteMany({ where: { accountId: id } }),
            prisma.account.delete({ where: { id } }),
        ]);
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
