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

        // Generate date ranges for the 6-month chart
        const sixMonthsAgo = startOfMonth(subMonths(now, 5));
        const monthRanges = Array.from({ length: 6 }, (_, i) => {
            const date = subMonths(now, 5 - i);
            return {
                label: date.toLocaleString("en-CA", { month: "short" }),
                start: startOfMonth(date),
                end: endOfMonth(date),
            };
        });

        const [
            monthlyIncome,
            monthlyExpenses,
            lastMonthIncome,
            accounts,
            recentTransactions,
            categorySpending,
            budgets,
            // Single batch query: income + expense per month for chart
            chartAggregations,
        ] = await Promise.all([
            aggregateByType(user.householdId, "income", thisMonthStart, thisMonthEnd),
            aggregateByType(user.householdId, "expense", thisMonthStart, thisMonthEnd),
            aggregateByType(user.householdId, "income", lastMonthStart, lastMonthEnd),
            prisma.account.findMany({ 
                where: { householdId: user.householdId },
                select: { balance: true, type: true } 
            }),
            prisma.transaction.findMany({
                where: { householdId: user.householdId, isTransfer: false },
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
            // 6-month chart data — single batch query instead of 12 individual queries
            prisma.transaction.groupBy({
                by: ["type", "date"],
                where: {
                    householdId: user.householdId,
                    isTransfer: false,
                    date: { gte: sixMonthsAgo, lte: thisMonthEnd },
                },
                _sum: { amount: true },
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

        // Enrich budgets with spending — single batch query instead of N+1
        const budgetCategoryIds = budgets.map((b) => b.categoryId).filter(Boolean) as string[];
        const budgetSpending = budgetCategoryIds.length
            ? await prisma.transaction.groupBy({
                by: ["categoryId"],
                where: {
                    categoryId: { in: budgetCategoryIds },
                    date: { gte: thisMonthStart, lte: thisMonthEnd },
                    type: "expense",
                    isTransfer: false,
                    householdId: user.householdId,
                },
                _sum: { amount: true },
              })
            : [];
        const spendingMap = Object.fromEntries(
            budgetSpending.map((s) => [s.categoryId, s._sum.amount || 0])
        );

        const enrichedBudgets = budgets.map((b) => {
            const spent = spendingMap[b.categoryId] ?? 0;
            return {
                id: b.id,
                name: b.category.name,
                amount: b.amount,
                spent,
                progress: (spent / b.amount) * 100,
            };
        });

        // Compute chart data from the single batch aggregation
        // chartAggregations returns rows like { type: "income", date: 2026-01-01, _sum: { amount: 5000 } }
        const chartData = monthRanges.map(({ label, start, end }) => {
            const inc = chartAggregations
                .filter((r) => r.type === "income" && r.date >= start && r.date <= end)
                .reduce((sum, r) => sum + (r._sum.amount || 0), 0);
            const exp = chartAggregations
                .filter((r) => r.type === "expense" && r.date >= start && r.date <= end)
                .reduce((sum, r) => sum + (r._sum.amount || 0), 0);
            return { name: label, total: inc - exp, income: inc, expenses: exp };
        });

        // Net worth from account balances (more accurate than income-expenses)
        const netWorth = accounts.reduce(
            (sum, a) => (a.type === "credit" ? sum - a.balance : sum + a.balance),
            0
        );

        const savingsRate =
            monthlyIncome > 0
                ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
                : 0;

        const incomeTrend =
            lastMonthIncome > 0
                ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100
                : 0;

        return {
            success: true,
            data: {
                netWorth,
                monthlyIncome,
                monthlyExpenses,
                savingsRate,
                incomeTrend: (incomeTrend >= 0 ? "+" : "") + new Intl.NumberFormat("en-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(incomeTrend) + "%",
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
