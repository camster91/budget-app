"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";
import { startOfDay, endOfDay, addDays } from "date-fns";

interface IncomeLike {
    frequency: string;
    startDate: Date;
    amount: number;
    dayOfMonth: number | null;
}

function getNextPayDate(income: { frequency: string; startDate: Date; dayOfMonth: number | null }, from: Date): Date {
    const { frequency, startDate, dayOfMonth } = income;
    let next = new Date(startDate);
    while (next <= from) {
        if (frequency === "weekly") next.setDate(next.getDate() + 7);
        else if (frequency === "biweekly") next.setDate(next.getDate() + 14);
        else if (frequency === "monthly" || !frequency) {
            next.setMonth(next.getMonth() + 1);
            if (dayOfMonth) next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
        }
    }
    return next;
}

export async function getCommandCenter() {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const threeDaysFromNow = addDays(now, 3);

    const [
        incomes,
        bills,
        budgets,
        entriesToday,
        spentTodayAgg,
        allTodayEntries,
    ] = await Promise.all([
        prisma.income.findMany({ where: { isActive: true, householdId: user.householdId } }),
        prisma.bill.findMany({
            where: { isActive: true, householdId: user.householdId },
            orderBy: { dueDay: "asc" },
        }),
        prisma.budget.findMany({
            where: { period: now.toISOString().slice(0, 7), householdId: user.householdId },
            include: { category: true },
        }),
        prisma.transaction.findMany({
            where: {
                type: "expense",
                date: { gte: todayStart, lte: todayEnd },
                isTransfer: false,
                householdId: user.householdId,
            },
            include: { category: { select: { name: true } } },
            orderBy: { date: "desc" },
            take: 20,
        }),
        prisma.transaction.aggregate({
            where: {
                type: "expense",
                date: { gte: todayStart, lte: todayEnd },
                isTransfer: false,
                householdId: user.householdId,
            },
            _sum: { amount: true },
        }),
        prisma.transaction.count({
            where: { date: { gte: todayStart, lte: todayEnd }, type: "expense", householdId: user.householdId },
        }),
    ]);

    const spentToday = spentTodayAgg._sum.amount || 0;

    // Calculate daily allowance
    let availableToday = 0;
    let daysRemaining = 0;
    let dailyAllowance = 0;
    let totalIncome = 0;

    if (incomes.length > 0) {
        totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
        const payDates = incomes.map((i) =>
            getNextPayDate({ frequency: i.frequency, startDate: i.startDate, dayOfMonth: i.dayOfMonth }, now)
        );
        const nextPayDate = payDates.reduce((a, b) => (a < b ? a : b));
        const primaryIncome = incomes[payDates.indexOf(nextPayDate)];

        // Find period start = previous pay date
        let periodStart = new Date(primaryIncome.startDate);
        while (periodStart < now) {
            const next = getNextPayDate(
                { frequency: primaryIncome.frequency, startDate: periodStart, dayOfMonth: primaryIncome.dayOfMonth },
                new Date(periodStart.getTime() + 86400000)
            );
            if (next > now) break;
            periodStart = new Date(next);
        }

        const daysTotal = Math.max(1, Math.ceil((nextPayDate.getTime() - periodStart.getTime()) / 86400000));
        daysRemaining = Math.max(0, Math.ceil((nextPayDate.getTime() - now.getTime()) / 86400000));

        // Bills due in period
        const periodBills = bills.filter((b) => {
            const dueDay = b.dueDay;
            const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
            return dueDate >= periodStart && dueDate <= nextPayDate;
        });
        const billsTotal = periodBills.reduce((s, b) => s + b.amount, 0);

        const availableToSpend = totalIncome - billsTotal;
        dailyAllowance = daysTotal > 0 ? availableToSpend / daysTotal : 0;

        // Accumulated spending so far
        const periodStartDay = startOfDay(periodStart);
        const yesterday = startOfDay(now);
        const periodSpendingAgg = await prisma.transaction.aggregate({
            where: {
                type: "expense",
                date: { gte: periodStartDay, lt: yesterday },
                isTransfer: false,
                householdId: user.householdId,
            },
            _sum: { amount: true },
        });
        const totalSpentSoFar = periodSpendingAgg._sum.amount || 0;
        const daysElapsed = daysTotal - daysRemaining;
        const expectedSpentSoFar = dailyAllowance * daysElapsed;
        const accumulatedSurplus = expectedSpentSoFar - totalSpentSoFar;
        const vaultReleased = accumulatedSurplus > 0 ? Math.round(accumulatedSurplus * 0.2) : 0;

        availableToday = dailyAllowance + vaultReleased - spentToday;
    }

    // Urgent: bills due within 3 days
    const urgentBills = bills
        .filter((b) => {
            const today = now.getDate();
            const daysUntilDue = b.dueDay >= today ? b.dueDay - today : b.dueDay + new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - today;
            return daysUntilDue <= 3;
        })
        .slice(0, 5)
        .map((b) => {
            const today = now.getDate();
            const daysUntil = b.dueDay >= today ? b.dueDay - today : b.dueDay + new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - today;
            return { id: b.id, name: b.name, amount: b.amount, dueDay: b.dueDay, daysUntil };
        });

    // Urgent: budgets near/over limit
    const overBudget = [];
    for (const b of budgets) {
        const catSpending = await prisma.transaction.aggregate({
            where: {
                type: "expense",
                categoryId: b.categoryId,
                date: { gte: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)) },
                isTransfer: false,
                householdId: user.householdId,
            },
            _sum: { amount: true },
        });
        const spent = catSpending._sum.amount || 0;
        const progress = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        if (progress > 80) {
            overBudget.push({
                id: b.id,
                name: b.category?.name || "Unknown",
                spent,
                amount: b.amount,
                progress: Math.round(progress),
            });
        }
    }

    const entries = entriesToday.map((t) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        category: t.category?.name || "Uncategorized",
    }));

    return {
        success: true,
        data: {
            availableToday,
            daysRemaining,
            dailyAllowance,
            spentToday,
            totalIncome,
            entriesToday: entries,
            urgentBills,
            overBudget,
        },
    };
}
