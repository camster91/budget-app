"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { startOfDay, endOfDay } from "date-fns";

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
                isDiscretionary: true,
                isDuplicate: false,
                householdId: user.householdId,
            },
            _sum: { amount: true },
        });

        const total = spent._sum.amount || 0;
        const dailyAllowance = 65; // would be calculated from income

        if (total > dailyAllowance * 0.8 && total <= dailyAllowance) {
            return {
                title: "Budget App: Watch it",
                body: `You've spent ${Math.round((total / dailyAllowance) * 100)}% of today's budget. ${(dailyAllowance - total).toFixed(0)} left.`,
                tag: "budget-warning",
                requireInteraction: false,
            };
        }

        if (total > dailyAllowance) {
            return {
                title: "Budget App: Over budget",
                body: `You overspent by ${(total - dailyAllowance).toFixed(0)}. Tomorrow's allowance is now reduced.`,
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
                body: `${soon.map((b) => `${b.name} ($${b.amount})`).join(", ")}`,
                tag: "bill-reminder",
                url: "/daily",
            };
        }

        return null;
    } catch {
        return null;
    }
}
