"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function exportTransactionsToCSV(month?: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const targetMonth = month ? new Date(`${month}-01`) : new Date();
        const start = startOfMonth(targetMonth);
        const end = endOfMonth(targetMonth);

        const transactions = await prisma.transaction.findMany({
            where: {
                date: { gte: start, lte: end },
                isDuplicate: false,
                householdId: user.householdId,
            },
            include: { category: true, account: true },
            orderBy: { date: "desc" },
        });

        // CSV headers
        const headers = ["Date", "Type", "Description", "Category", "Account", "Amount", "Tags", "Source"];

        const rows = transactions.map((t) => [
            format(t.date, "yyyy-MM-dd"),
            t.type,
            `"${t.description.replace(/"/g, '""')}"`,
            t.category?.name || "Uncategorized",
            t.account?.name || "",
            t.amount.toFixed(2),
            t.isDiscretionary ? "discretionary" : "fixed",
            t.source || "manual",
        ]);

        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

        return {
            success: true,
            data: {
                csv,
                filename: `budget-app-${format(targetMonth, "yyyy-MM")}.csv`,
                count: transactions.length,
            },
        };
    } catch (error) {
        console.error("Export error:", error);
        return { success: false, error: "Failed to export" };
    }
}

export async function exportTransactionsToJSON(month?: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const targetMonth = month ? new Date(`${month}-01`) : new Date();
        const start = startOfMonth(targetMonth);
        const end = endOfMonth(targetMonth);

        const transactions = await prisma.transaction.findMany({
            where: { 
                date: { gte: start, lte: end }, 
                isDuplicate: false,
                householdId: user.householdId,
            },
            include: { category: true },
            orderBy: { date: "desc" },
        });

        return {
            success: true,
            data: {
                json: JSON.stringify(transactions, null, 2),
                filename: `budget-app-${format(targetMonth, "yyyy-MM")}.json`,
                count: transactions.length,
            },
        };
    } catch (error) {
        return { success: false, error: "Failed to export" };
    }
}
