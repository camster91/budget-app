"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function createAccount(formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const name = formData.get("name") as string;
        const type = formData.get("type") as string;
        const institution = formData.get("institution") as string;
        const balance = parseFloat(formData.get("balance") as string || "0");
        const color = formData.get("color") as string;

        await prisma.account.create({
            data: { 
                name, 
                type, 
                institution: institution || null, 
                balance, 
                color: color || null,
                householdId: user.householdId
            },
        });
        revalidatePath("/accounts");
        return { success: true };
    } catch (error) {
        console.error("Failed to create account:", error);
        return { success: false, error: "Failed to create account" };
    }
}

export async function updateAccountBalance(id: string, balance: number) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        await prisma.account.update({ 
            where: { id, householdId: user.householdId }, 
            data: { balance } 
        });
        revalidatePath("/accounts");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to update balance:", error);
        return { success: false, error: "Failed to update balance" };
    }
}

export async function deleteAccount(id: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        await prisma.$transaction([
            // Transactions have nullable accountId — null them out.
            // Bills have required accountId — delete them.
            prisma.transaction.updateMany({ 
                where: { accountId: id, householdId: user.householdId }, 
                data: { accountId: null } 
            }),
            prisma.bill.deleteMany({ 
                where: { accountId: id, householdId: user.householdId } 
            }),
            prisma.account.delete({ 
                where: { id, householdId: user.householdId } 
            }),
        ]);
        revalidatePath("/accounts");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete account:", error);
        return { success: false, error: "Failed to delete account" };
    }
}

export async function getAccounts() {
    const user = await getAuthUser();
    if (!user) return [];
    return await prisma.account.findMany({ 
        where: { householdId: user.householdId },
        orderBy: { createdAt: "asc" } 
    });
}
