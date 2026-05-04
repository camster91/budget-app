"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks, format } from "date-fns";

export async function getWeeklyReview(date?: Date) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const target = date || new Date();
        const start = startOfWeek(target, { weekStartsOn: 1 });
        const end = endOfWeek(target, { weekStartsOn: 1 });

        const [transactions, prevWeekStart, prevWeekEnd] = [
            await prisma.transaction.findMany({
                where: { date: { gte: start, lte: end }, type: "expense", isDuplicate: false, householdId: user.householdId },
                include: { category: true },
                orderBy: { date: "desc" },
            }),
            subWeeks(start, 1),
            subWeeks(end, 1),
        ];

        const prevTransactions = await prisma.transaction.findMany({
            where: { date: { gte: prevWeekStart, lte: prevWeekEnd }, type: "expense", isDuplicate: false, householdId: user.householdId },
        });

        const total = transactions.reduce((s, t) => s + t.amount, 0);
        const prevTotal = prevTransactions.reduce((s, t) => s + t.amount, 0);
        const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

        const byDay = Array.from({ length: 7 }, (_, i) => {
            const dayDate = new Date(start);
            dayDate.setDate(start.getDate() + i);
            const dayTotal = transactions
                .filter((t) => t.date.getDate() === dayDate.getDate())
                .reduce((s, t) => s + t.amount, 0);
            return { name: format(dayDate, "EEE"), amount: dayTotal };
        });

        const byCategory = await prisma.transaction.groupBy({
            by: ["categoryId"],
            where: { date: { gte: start, lte: end }, type: "expense", isDuplicate: false, householdId: user.householdId },
            _sum: { amount: true },
        });

        const topCategory = byCategory
            .map((c) => ({ id: c.categoryId, amount: c._sum.amount || 0 }))
            .sort((a, b) => b.amount - a.amount)[0];

        return {
            success: true,
            data: {
                weekRange: `${format(start, "MMM d")} - ${format(end, "MMM d")}`,
                total,
                change,
                transactionCount: transactions.length,
                byDay,
                byCategory: byCategory.filter((c) => (c._sum.amount ?? 0) > 0).map((c) => ({
                    id: c.categoryId,
                    amount: c._sum.amount || 0,
                })),
                topCategory,
                averagePerDay: total / 7,
            },
        };
    } catch (error) {
        return { success: false, error: "Failed to load weekly review" };
    }
}

export async function getMonthlyReview(month?: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const target = month ? new Date(`${month}-01`) : new Date();
        const start = startOfMonth(target);
        const end = endOfMonth(target);

        const transactions = await prisma.transaction.findMany({
            where: { date: { gte: start, lte: end }, type: "expense", isDuplicate: false, householdId: user.householdId },
            include: { category: true },
            orderBy: { date: "desc" },
        });

        const prevStart = subMonths(start, 1);
        const prevEnd = subMonths(end, 1);
        const prevTransactions = await prisma.transaction.findMany({
            where: { date: { gte: prevStart, lte: prevEnd }, type: "expense", isDuplicate: false, householdId: user.householdId },
        });

        const total = transactions.reduce((s, t) => s + t.amount, 0);
        const prevTotal = prevTransactions.reduce((s, t) => s + t.amount, 0);
        const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

        const byWeek = Array.from({ length: 4 }, (_, i) => {
            const ws = new Date(start);
            ws.setDate(start.getDate() + i * 7);
            const we = new Date(ws);
            we.setDate(ws.getDate() + 6);
            const weekTotal = transactions
                .filter((t) => t.date >= ws && t.date <= we)
                .reduce((s, t) => s + t.amount, 0);
            return { name: `Week ${i + 1}`, amount: weekTotal };
        });

        return {
            success: true,
            data: {
                month: format(target, "MMMM yyyy"),
                total,
                change,
                transactionCount: transactions.length,
                byWeek,
                averagePerDay: total / (end.getDate() - start.getDate() + 1),
                highestDay: transactions.reduce((m, t) => Math.max(m, t.amount), 0),
            },
        };
    } catch (error) {
        return { success: false, error: "Failed to load monthly review" };
    }
}
