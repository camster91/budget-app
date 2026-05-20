"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { startOfDay, endOfDay, differenceInDays, isBefore } from "date-fns";
import { getNextPayDate, getPeriodStart, isBillDueInPeriod } from "@/lib/dateUtils";
import { formatDecimal } from "@/lib/locale";
import { formatCurrency } from "@/lib/utils";

export interface PushMessage {
    title: string;
    body: string;
    tag: string;
    requireInteraction?: boolean;
    actions?: { action: string; title: string }[];
    url?: string;
}

export async function getPushSubscription() {
    try {
        const auth = await getAuthUser();
        if (!auth) return { success: false, error: "Unauthorized" };
        // In a real app, you'd store VAPID subscriptions in the DB
        return { success: true, data: { enabled: true } };
    } catch {
        return { success: false, error: "Failed" };
    }
}

export async function triggerSpendingAlert(): Promise<PushMessage | null> {
    const user = await getAuthUser();
    if (!user) return null;
    try {
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        const spent = await prisma.transaction.aggregate({
            where: {
                type: "expense",
                date: { gte: todayStart, lte: todayEnd },
                isTransfer: false,
                isDuplicate: false,
                householdId: user.householdId,
            },
            _sum: { amount: true },
        });

        const total = spent._sum.amount || 0;
        const dailyAllowance = await calculateDailyAllowance(user.householdId!);

        if (dailyAllowance <= 0) return null;

        if (total > dailyAllowance * 0.8 && total <= dailyAllowance) {
            return {
                title: "Budget App: Watch it",
                body: `You've spent ${Math.round((total / dailyAllowance) * 100)}% of today's budget. ${formatDecimal(dailyAllowance - total, 0)} left.`,
                tag: "budget-warning",
                requireInteraction: false,
            };
        }

        if (total > dailyAllowance) {
            return {
                title: "Budget App: Over budget",
                body: `You overspent by ${formatDecimal(total - dailyAllowance, 0)}. Tomorrow's allowance is now reduced.`,
                tag: "budget-over",
                requireInteraction: true,
                actions: [
                    { action: "log-spend", title: "Log Spend" },
                    { action: "dismiss", title: "Dismiss" },
                ],
                url: "/daily",
            };
        }

        return null;
    } catch {
        return null;
    }
}

async function calculateDailyAllowance(householdId: string): Promise<number> {
    try {
        const incomes = await prisma.income.findMany({
            where: { isActive: true, householdId },
        });
        if (incomes.length === 0) return 0;

        const now = new Date();

        // Find the nearest upcoming pay date across ALL income sources
        const payDates = incomes.map((i) => getNextPayDate(i, now));
        const nextPayDate = payDates.reduce((a, b) => (isBefore(a, b) ? a : b));
        const primaryIncome = incomes[payDates.indexOf(nextPayDate)];
        const periodStart = getPeriodStart(primaryIncome, nextPayDate);
        const daysTotal = Math.max(1, differenceInDays(nextPayDate, periodStart));

        // Total income this period
        const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);

        // Bills due in this period
        const bills = await prisma.bill.findMany({
            where: { isActive: true, householdId },
        });
        const upcomingBillsTotal = bills
            .filter((b) => isBillDueInPeriod(b, periodStart, nextPayDate))
            .reduce((s, b) => s + b.amount, 0);

        const availableToSpend = totalIncome - upcomingBillsTotal;
        return daysTotal > 0 ? availableToSpend / daysTotal : 0;
    } catch {
        return 0;
    }
}

export async function triggerBillReminder(): Promise<PushMessage | null> {
    const user = await getAuthUser();
    if (!user) return null;
    try {
        const today = new Date();
        const upcoming = await prisma.bill.findMany({
            where: { isActive: true, householdId: user.householdId },
        });

        const soon = upcoming.filter((b) => {
            const daysUntil = b.dueDay - today.getDate();
            return daysUntil >= 0 && daysUntil <= 2;
        });

        if (soon.length > 0) {
            return {
                title: `Budget App: Bill due soon`,
                body: `${soon.map((b) => `${b.name} (${formatCurrency(b.amount)})`).join(", ")}`,
                tag: "bill-reminder",
                url: "/daily",
            };
        }

        return null;
    } catch {
        return null;
    }
}
