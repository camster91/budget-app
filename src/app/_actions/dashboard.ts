"use server";

import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

export async function getDashboardSummary() {
    try {
        const transactions = await prisma.transaction.findMany();

        const totalIncome = transactions
            .filter((t: any) => t.type === 'income')
            .reduce((sum: number, t: any) => sum + t.amount, 0);

        const totalExpenses = transactions
            .filter((t: any) => t.type === 'expense')
            .reduce((sum: number, t: any) => sum + t.amount, 0);

        const netWorth = totalIncome - totalExpenses;

        // Current month stats
        const now = new Date();
        const firstDayOfMonth = startOfMonth(now);
        const lastDayOfMonth = endOfMonth(now);

        const currentMonthTransactions = transactions.filter((t: any) =>
            t.date >= firstDayOfMonth && t.date <= lastDayOfMonth
        );

        const monthlyIncome = currentMonthTransactions
            .filter((t: any) => t.type === 'income')
            .reduce((sum: number, t: any) => sum + t.amount, 0);

        const monthlyExpenses = currentMonthTransactions
            .filter((t: any) => t.type === 'expense')
            .reduce((sum: number, t: any) => sum + t.amount, 0);

        const savingsRate = monthlyIncome > 0
            ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
            : 0;

        // Last month for trends
        const firstDayOfLastMonth = startOfMonth(subMonths(now, 1));
        const lastDayOfLastMonth = endOfMonth(subMonths(now, 1));

        const lastMonthTransactions = transactions.filter((t: any) =>
            t.date >= firstDayOfLastMonth && t.date <= lastDayOfLastMonth
        );

        const lastMonthIncome = lastMonthTransactions
            .filter((t: any) => t.type === 'income')
            .reduce((sum: number, t: any) => sum + t.amount, 0);

        const incomeTrend = lastMonthIncome > 0
            ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100
            : 0;

        // Chart data (last 7 months)
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = subMonths(now, i);
            const mStart = startOfMonth(date);
            const mEnd = endOfMonth(date);

            const monthTransactions = transactions.filter((t: any) =>
                t.date >= mStart && t.date <= mEnd
            );

            const mIncome = monthTransactions.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0);
            const mExpenses = monthTransactions.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0);

            chartData.push({
                name: date.toLocaleString('default', { month: 'short' }),
                total: mIncome - mExpenses,
                income: mIncome,
                expenses: mExpenses
            });
        }

        return {
            success: true,
            data: {
                netWorth,
                monthlyIncome,
                monthlyExpenses,
                savingsRate,
                incomeTrend: incomeTrend.toFixed(1) + "%",
                chartData,
                transactions: transactions.slice(0, 5) // Recent activity
            }
        };
    } catch (error) {
        console.error("Dashboard data fetch error:", error);
        return { success: false, error: "Failed to fetch dashboard data" };
    }
}
