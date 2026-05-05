"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import { getAuthUser } from "@/lib/auth";

async function aggregateByType(householdId: string, type: string, gte?: Date, lte?: Date) {
    const where: Prisma.TransactionWhereInput = { 
        type, 
        householdId,
        isTransfer: false // Exclude transfers from major summary aggregates
    };
    if (gte || lte) where.date = { ...(gte && { gte }), ...(lte && { lte }) };
    const result = await prisma.transaction.aggregate({ where, _sum: { amount: true } });
    return result._sum.amount || 0;
}

export async function getDashboardSummary() {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const thisMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        const [
            totalIncome,
            totalExpenses,
            monthlyIncome,
            monthlyExpenses,
            lastMonthIncome,
            accounts,
            recentTransactions,
            categorySpending,
            budgets,
        ] = await Promise.all([
            aggregateByType(user.householdId, "income"),
            aggregateByType(user.householdId, "expense"),
            aggregateByType(user.householdId, "income", thisMonthStart, thisMonthEnd),
            aggregateByType(user.householdId, "expense", thisMonthStart, thisMonthEnd),
            aggregateByType(user.householdId, "income", lastMonthStart, lastMonthEnd),
            prisma.account.findMany({ 
                where: { householdId: user.householdId },
                select: { balance: true, type: true } 
            }),
            prisma.transaction.findMany({
                where: { householdId: user.householdId },
                take: 5,
                orderBy: { date: "desc" },
                include: { category: true },
            }),
            // Top spending categories this month
            prisma.transaction.groupBy({
                by: ["categoryId"],
                where: {
                    type: "expense",
                    date: { gte: thisMonthStart, lte: thisMonthEnd },
                    isTransfer: false,
                    householdId: user.householdId,
                },
                _sum: { amount: true },
                orderBy: { _sum: { amount: "desc" } },
                take: 6,
            }),
            // Budgets with spending for health widget
            prisma.budget.findMany({
                where: { period: now.toISOString().slice(0, 7), householdId: user.householdId },
                include: { category: true },
                take: 5,
                orderBy: { amount: "desc" },
            }),
        ]);

        // Enrich category spending with names
        const categoryIds = categorySpending
            .map((c) => c.categoryId)
            .filter(Boolean) as string[];
        const categories = categoryIds.length
            ? await prisma.category.findMany({ where: { id: { in: categoryIds }, householdId: user.householdId } })
            : [];
        const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

        const spendingByCategory = categorySpending
            .filter((c) => c.categoryId && (c._sum.amount || 0) > 0)
            .map((c) => ({
                name: categoryMap[c.categoryId!]?.name ?? "Uncategorized",
                amount: c._sum.amount || 0,
                color: categoryMap[c.categoryId!]?.color ?? "#6366f1",
            }));

        // Enrich budgets with spending
        const enrichedBudgets = await Promise.all(
            budgets.map(async (b) => {
                const agg = await prisma.transaction.aggregate({
                    where: {
                        categoryId: b.categoryId,
                        date: { gte: thisMonthStart, lte: thisMonthEnd },
                        type: "expense",
                        isTransfer: false,
                        householdId: user.householdId,
                    },
                    _sum: { amount: true },
                });
                const spent = agg._sum.amount || 0;
                return {
                    id: b.id,
                    name: b.category.name,
                    amount: b.amount,
                    spent,
                    progress: (spent / b.amount) * 100,
                };
            })
        );

        // Net worth from account balances, or transaction-based fallback
        const accountNetWorth = accounts.reduce(
            (sum, a) => (a.type === "credit" ? sum - a.balance : sum + a.balance),
            0
        );
        const netWorth = accounts.length > 0 ? accountNetWorth : totalIncome - totalExpenses;

        const savingsRate =
            monthlyIncome > 0
                ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
                : 0;

        const incomeTrend =
            lastMonthIncome > 0
                ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100
                : 0;

        // 6-month cashflow chart
        const chartData = await Promise.all(
            Array.from({ length: 6 }, (_, i) => 5 - i).map(async (i) => {
                const date = subMonths(now, i);
                const [inc, exp] = await Promise.all([
                    aggregateByType(user.householdId, "income", startOfMonth(date), endOfMonth(date)),
                    aggregateByType(user.householdId, "expense", startOfMonth(date), endOfMonth(date)),
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
                spendingByCategory,
                budgetHealth: enrichedBudgets,
            },
        };
    } catch (error) {
        console.error("Dashboard data fetch error:", error);
        return { success: false, error: "Failed to fetch dashboard data" };
    }
}
