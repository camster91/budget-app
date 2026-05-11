"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function createBill(formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const name = formData.get("name") as string;
        const amount = parseFloat(formData.get("amount") as string);
        const dueDay = parseInt(formData.get("dueDay") as string);
        const categoryId = formData.get("categoryId") as string;
        const accountId = formData.get("accountId") as string;

        await prisma.bill.create({
            data: { name, amount, dueDay, categoryId, accountId, householdId: user.householdId },
        });
        revalidatePath("/bills");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to create bill" };
    }
}

export async function updateBill(id: string, formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const name = formData.get("name") as string;
        const amount = parseFloat(formData.get("amount") as string);
        const dueDay = parseInt(formData.get("dueDay") as string);
        const categoryId = formData.get("categoryId") as string;
        const accountId = formData.get("accountId") as string;

        await prisma.bill.update({
            where: { id, householdId: user.householdId },
            data: { name, amount, dueDay, categoryId, accountId },
        });
        revalidatePath("/bills");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update bill" };
    }
}

export async function deleteBill(id: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        await prisma.bill.delete({ where: { id, householdId: user.householdId } });
        revalidatePath("/bills");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete bill" };
    }
}

export async function markBillAsPaid(id: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const bill = await prisma.bill.findUnique({ where: { id, householdId: user.householdId } });
        if (!bill) return { success: false, error: "Bill not found" };

        await prisma.transaction.create({
            data: {
                amount: bill.amount,
                description: `Bill Payment: ${bill.name}`,
                date: new Date(),
                type: "expense",
                isDiscretionary: false,
                isRecurring: true,
                source: "manual",
                categoryId: bill.categoryId,
                accountId: bill.accountId,
                billId: bill.id,
                householdId: user.householdId
            }
        });

        await prisma.bill.update({
            where: { id },
            data: { paidAt: new Date() },
        });

        revalidatePath("/bills");
        revalidatePath("/daily");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[markBillAsPaid]", error);
        return { success: false, error: "Failed to mark bill as paid" };
    }
}

export async function getPaymentHistory() {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const payments = await prisma.transaction.findMany({
            where: {
                householdId: user.householdId,
                billId: { not: null },
            },
            orderBy: { date: "desc" },
            take: 50,
            include: {
                bill: { select: { name: true, amount: true } },
                category: { select: { name: true } },
                account: { select: { name: true } },
            },
        });
        return { success: true, data: payments };
    } catch (error) {
        return { success: false, error: "Failed to fetch payment history" };
    }
}

