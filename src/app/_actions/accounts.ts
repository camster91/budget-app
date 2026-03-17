"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createAccount(formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const type = formData.get("type") as string;
        const institution = formData.get("institution") as string;
        const balance = parseFloat(formData.get("balance") as string || "0");

        await prisma.account.create({
            data: { name, type, institution, balance },
        });
        revalidatePath("/accounts");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to create account" };
    }
}

export async function getAccounts() {
    return await prisma.account.findMany();
}
