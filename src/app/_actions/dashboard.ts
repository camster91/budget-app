"use server";

import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

async function aggregateByType(type: string, gte?: Date, lte?: Date) {
    const where: any = { type };
    if (gte || lte) where.date = { ...(gte && { gte }), ...(lte && { lte }) };
    const result = await prisma.transaction.aggregate({ where, _sum: { amount: true } });
    return result._sum.amount || 0;
}

export async function getDashboardSummary() {
    try {
        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const thisMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        // Run all aggregations in parallel
        const [
            totalIncome,
            totalExpenses,
            monthlyIncome,
            monthlyExpenses,
            lastMonthIncome,
            accounts,
            recentTransactions,
        ] = await Promise.all([
            aggregateByType("income"),
            aggregateByType("expense"),
            aggregateByType("income", thisMonthStart, thisMonthEnd),
            aggregateByType("expense", thisMonthStart, thisMonthEnd),
            aggregateByType("income", lastMonthStart, lastMonthEnd),
            prisma.account.findMany({ select: { balance: true, type: true } }),
            prisma.transaction.findMany({
                take: 5,
                orderBy: { date: "desc" },
                include: { category: true },
            }),
        ]);

        // Net worth: account balances (credit cards are liabilities)
        const accountNetWorth = accounts.reduce((sum, a) =>
            a.type === "credit" ? sum - a.balance : sum + a.balance, 0
        );
        // Fall back to transaction-based if no accounts configured
        const txNetWorth = totalIncome - totalExpenses;
        const netWorth = accounts.length > 0 ? accountNetWorth : txNetWorth;

        const savingsRate = monthlyIncome > 0
            ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
            : 0;

        const incomeTrend = lastMonthIncome > 0
            ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100
            : 0;

        // Chart: 6 months of monthly net cashflow
        const chartData = await Promise.all(
            Array.from({ length: 6 }, (_, i) => 5 - i).map(async (i) => {
                const date = subMonths(now, i);
                const mStart = startOfMonth(date);
                const mEnd = endOfMonth(date);
                const [inc, exp] = await Promise.all([
                    aggregateByType("income", mStart, mEnd),
                    aggregateByType("expense", mStart, mEnd),
                ]);
                return {
                    name: date.toLocaleString("default", { month: "short" }),
                    total: inc - exp,
                    income: inc,
                    expenses: exp,
                };
            })
        );

        return {
            success: true,
            data: {
                netWorth,
                monthlyIncome,
                monthlyExpenses,
                savingsRate,
                incomeTrend: (incomeTrend >= 0 ? "+" : "") + incomeTrend.toFixed(1) + "%",
                chartData,
                transactions: recentTransactions,
            },
        };
    } catch (error) {
        console.error("Dashboard data fetch error:", error);
        return { success: false, error: "Failed to fetch dashboard data" };
    }
}
