"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
    startOfDay, endOfDay, differenceInDays,
    addDays, addWeeks, addMonths, isBefore, isAfter,
    parseISO, format, subDays, getDay,
} from "date-fns";

// ═════════════════════════════════════════════════════════════
//  DATE HELPERS — Multi-income, multi-frequency aware
// ═════════════════════════════════════════════════════════════

function getNextPayDate(income: {
    frequency: string;
    startDate: Date;
    dayOfMonth: number | null;
}, from: Date = new Date()): Date {
    const { frequency, startDate, dayOfMonth } = income;
    let next = new Date(startDate);

    while (isBefore(next, from)) {
        if (frequency === "weekly") next = addWeeks(next, 1);
        else if (frequency === "biweekly") next = addWeeks(next, 2);
        else {
            next = addMonths(next, 1);
            if (dayOfMonth) {
                const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
                next.setDate(Math.min(dayOfMonth, daysInMonth));
            }
        }
    }
    return next;
}

function getPeriodStart(income: {
    frequency: string;
    startDate: Date;
}, nextPayDate: Date): Date {
    const { frequency, startDate } = income;
    let periodStart = new Date(startDate);

    while (true) {
        let candidate: Date;
        if (frequency === "weekly") candidate = addWeeks(periodStart, 1);
        else if (frequency === "biweekly") candidate = addWeeks(periodStart, 2);
        else candidate = addMonths(periodStart, 1);

        if (isBefore(candidate, nextPayDate) || candidate.getTime() === nextPayDate.getTime()) {
            periodStart = candidate;
        } else {
            break;
        }
    }
    return periodStart;
}

function isBillDueInPeriod(bill: BillLike, periodStart: Date, periodEnd: Date): boolean {
    const startDay = periodStart.getDate();
    const endDay = periodEnd.getDate();
    const startMonth = periodStart.getMonth();
    const endMonth = periodEnd.getMonth();

    if (startMonth === endMonth) {
        return bill.dueDay >= startDay && bill.dueDay < endDay;
    }
    return bill.dueDay >= startDay || bill.dueDay < endDay;
}

// ═════════════════════════════════════════════════════════════
//  INTERFACES
// ═════════════════════════════════════════════════════════════

interface BillLike {
    name: string;
    amount: number;
    dueDay: number;
    frequency?: string;
}

export interface DailySnapshot {
    dailyAllowance: number;
    todaysAvailable: number;
    spentToday: number;
    remainingToday: number;
    accumulatedSurplus: number;
    pace: { percent: number; label: string; color: string; emoji: string };
    period: {
        start: Date;
        end: Date;
        daysTotal: number;
        daysElapsed: number;
        daysRemaining: number;
    };
    totalIncome: number;
    incomeSources: { name: string; amount: number }[];
    upcomingBills: { name: string; amount: number; dueDay: number; daysUntil: number; isAutoDeduct: boolean }[];
    upcomingBillsTotal: number;
    entriesToday: { id: string; description: string; amount: number; category?: string | null; source?: string | null }[];
    projection: {
        atCurrentPace: number;
        projectedEndBalance: number;
        message: string;
    };
    smartInsights: string[];
    streak: number;
    bestStreak: number;
    categoryBreakdownToday: { name: string; amount: number; color: string | null }[];
}

// ═════════════════════════════════════════════════════════════
//  DAILY SNAPSHOT — THE CORE ENGINE
// ═════════════════════════════════════════════════════════════

export async function getDailySnapshot(): Promise<{ success: boolean; data?: DailySnapshot; error?: string }> {
    try {
        const incomes = await prisma.income.findMany({ where: { isActive: true } });
        if (incomes.length === 0) {
            return { success: false, error: "No income configured. Go to Settings > Income." };
        }

        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);

        // Find the nearest upcoming pay date across ALL income sources
        const payDates = incomes.map(i => getNextPayDate(i, now));
        const nextPayDate = payDates.reduce((a, b) => isBefore(a, b) ? a : b);
        const primaryIncome = incomes[payDates.indexOf(nextPayDate)];
        const periodStart = getPeriodStart(primaryIncome, nextPayDate);
        const daysTotal = Math.max(1, differenceInDays(nextPayDate, periodStart));
        const daysElapsed = Math.max(0, differenceInDays(now, periodStart));
        const daysRemaining = daysTotal - daysElapsed;

        // Total income this period
        const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
        const incomeSources = incomes.map(i => ({ name: i.name, amount: i.amount }));

        // Bills due in this period
        const bills = await prisma.bill.findMany({
            where: { isActive: true },
            include: { category: true },
        });
        const upcomingBills = bills
            .filter(b => isBillDueInPeriod(b, periodStart, nextPayDate))
            .map(b => {
                const today = now.getDate();
                let daysUntil = b.dueDay - today;
                if (daysUntil < 0) daysUntil += getDaysInCurrentMonth();
                return {
                    name: b.name,
                    amount: b.amount,
                    dueDay: b.dueDay,
                    daysUntil,
                    isAutoDeduct: b.isAutoDeduct,
                    category: b.category?.name,
                };
            })
            .sort((a, b) => a.daysUntil - b.daysUntil);

        const upcomingBillsTotal = upcomingBills.reduce((s, b) => s + b.amount, 0);
        const availableToSpend = totalIncome - upcomingBillsTotal;
        const dailyAllowance = daysTotal > 0 ? availableToSpend / daysTotal : 0;

        // Today's discretionary spending
        const todayEntries = await prisma.transaction.findMany({
            where: {
                type: "expense",
                date: { gte: todayStart, lte: todayEnd },
                isDiscretionary: true,
                isDuplicate: false,
            },
            include: { category: true },
            orderBy: { date: "desc" },
        });
        const spentToday = todayEntries.reduce((s, t) => s + t.amount, 0);

        // Accumulated surplus from period start to yesterday
        const yesterday = startOfDay(now); // midnight today = "before today"
        const periodSpending = await prisma.transaction.findMany({
            where: {
                type: "expense",
                date: { gte: periodStart, lt: yesterday },
                isDiscretionary: true,
                isDuplicate: false,
            },
        });
        const totalSpentSoFar = periodSpending.reduce((s, t) => s + t.amount, 0);
        const expectedSpentSoFar = dailyAllowance * daysElapsed;
        const accumulatedSurplus = expectedSpentSoFar - totalSpentSoFar;

        const todaysAvailable = dailyAllowance + accumulatedSurplus;
        const remainingToday = todaysAvailable - spentToday;

        // Pace calculation
        const pacePercent = totalSpentSoFar > 0 && daysElapsed > 0
            ? (expectedSpentSoFar / totalSpentSoFar) * 100
            : (spentToday > 0 ? (dailyAllowance / spentToday) * 100 : 100);

        let paceLabel = "On pace";
        let paceColor = "text-amber-400";
        let paceEmoji = "⚡";
        if (pacePercent < 80) {
            paceLabel = "Behind pace — slow down";
            paceColor = "text-rose-400";
            paceEmoji = "🔥";
        } else if (pacePercent > 120) {
            paceLabel = "Ahead of pace — nice!";
            paceColor = "text-emerald-400";
            paceEmoji = "🌱";
        } else if (accumulatedSurplus > 0) {
            paceLabel = `+$${fmt(accumulatedSurplus)} rolled over`;
            paceColor = "text-emerald-400";
            paceEmoji = "✨";
        }

        // Projection
        const avgDailySpend = daysElapsed > 0 ? totalSpentSoFar / daysElapsed : (spentToday > 0 ? spentToday : 0.01);
        const projectedTotalSpend = avgDailySpend * daysTotal;
        const projectedEndBalance = availableToSpend - projectedTotalSpend;

        let projectionMessage = "";
        if (projectedEndBalance > 50) {
            projectionMessage = `At this pace, you'll have ${fmt(projectedEndBalance)} left before payday`;
        } else if (projectedEndBalance > -20) {
            projectionMessage = "You're cutting it close — watch your spending";
        } else {
            projectionMessage = `At this pace, you'll overspend by ${fmt(Math.abs(projectedEndBalance))} before payday`;
        }

        // Streak calculation
        const streak = await calculateStreak(dailyAllowance);

        // Best streak from history
        const bestStreak = await calculateBestStreak(dailyAllowance);

        // Category breakdown today
        const categoryBreakdownToday = await prisma.transaction.groupBy({
            by: ["categoryId"],
            where: {
                type: "expense",
                date: { gte: todayStart, lte: todayEnd },
                isDiscretionary: true,
                isDuplicate: false,
            },
            _sum: { amount: true },
        });

        const categoryIds = categoryBreakdownToday.map((c) => c.categoryId).filter(Boolean) as string[];
        const categoryColors = categoryIds.length > 0
            ? await prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true, color: true } })
            : [];
        const colorMap = Object.fromEntries(categoryColors.map((c) => [c.id, c]));

        const enrichedCategoryBreakdown = categoryBreakdownToday
            .filter((c) => c._sum.amount && c._sum.amount > 0)
            .map((c) => ({
                name: colorMap[c.categoryId!]?.name || "Uncategorized",
                amount: c._sum.amount || 0,
                color: colorMap[c.categoryId!]?.color || "#52525b",
            }))
            .sort((a, b) => b.amount - a.amount);

        // Smart Insights
        const smartInsights = await generateSmartInsights({
            accumulatedSurplus, dailyAllowance, spentToday, remainingToday,
            daysRemaining, upcomingBills, avgDailySpend, pacePercent,
        });

        const { score, label: scoreLabel } = computeSpendingScore({
            pacePercent,
            accumulatedSurplus,
            dailyAllowance,
            totalIncome,
            upcomingBillsTotal,
            streak,
        });

        return {
            success: true,
            data: {
                dailyAllowance,
                todaysAvailable,
                spentToday,
                remainingToday,
                accumulatedSurplus,
                pace: { percent: Math.round(pacePercent), label: paceLabel, color: paceColor, emoji: paceEmoji },
                period: {
                    start: periodStart,
                    end: nextPayDate,
                    daysTotal,
                    daysElapsed,
                    daysRemaining,
                },
                totalIncome,
                incomeSources,
                upcomingBills: upcomingBills.slice(0, 6),
                upcomingBillsTotal,
                entriesToday: todayEntries.map(t => ({
                    id: t.id,
                    description: t.description,
                    amount: t.amount,
                    category: t.category?.name,
                    source: t.source,
                })),
                projection: {
                    atCurrentPace: avgDailySpend,
                    projectedEndBalance,
                    message: projectionMessage,
                },
                smartInsights,
                streak,
                bestStreak,
                categoryBreakdownToday: enrichedCategoryBreakdown,
                spendingScore: score,
                scoreLabel,
            },
        };
    } catch (error) {
        console.error("Daily snapshot error:", error);
        return { success: false, error: "Failed to calculate daily spending" };
    }
}

// ═════════════════════════════════════════════════════════════
//  SMART INSIGHTS ENGINE
// ═════════════════════════════════════════════════════════════

interface InsightInput {
    accumulatedSurplus: number;
    dailyAllowance: number;
    spentToday: number;
    remainingToday: number;
    daysRemaining: number;
    upcomingBills: { name: string; amount: number; daysUntil: number }[];
    avgDailySpend: number;
    pacePercent: number;
}

async function generateSmartInsights(input: InsightInput): Promise<string[]> {
    const insights: string[] = [];
    const { accumulatedSurplus, dailyAllowance, spentToday, remainingToday, daysRemaining, upcomingBills, avgDailySpend, pacePercent } = input;

    // Surplus streak
    if (accumulatedSurplus > dailyAllowance * 2) {
        insights.push(`You've banked ${fmt(accumulatedSurplus)} — that's ${Math.floor(accumulatedSurplus / dailyAllowance)} days of cushion`);
    }

    // Overspend alert
    if (remainingToday < 0) {
        insights.push(`You overspent by ${fmt(Math.abs(remainingToday))} today. Tomorrow's allowance drops to ${fmt(dailyAllowance + remainingToday)}`);
    }

    // Bill warning
    const soonBills = upcomingBills.filter(b => b.daysUntil <= 3);
    if (soonBills.length > 0) {
        const total = soonBills.reduce((s, b) => s + b.amount, 0);
        insights.push(`📅 ${soonBills.length} bill${soonBills.length > 1 ? 's' : ''} due soon (${fmt(total)})`);
    }

    // Speed indicator
    if (pacePercent < 70 && daysRemaining > 5) {
        insights.push("You're spending faster than your daily rate. Consider a no-spend day to catch up.");
    }

    // Low balance warning
    if (remainingToday < dailyAllowance * 0.3 && remainingToday > 0) {
        insights.push("Low on today's budget — big purchases should wait until tomorrow's rollover");
    }

    // Weekend / spending pattern (simplified)
    const dayOfWeek = getDay(new Date());
    if ((dayOfWeek === 5 || dayOfWeek === 6) && avgDailySpend > dailyAllowance * 1.3) {
        insights.push("Weekend spending is elevated — this is normal, but keep an eye on it");
    }

    // Deduplication insight
    const duplicatesToday = await prisma.transaction.count({
        where: {
            type: "expense",
            date: { gte: startOfDay(new Date()) },
            isDuplicate: true,
        },
    });
    if (duplicatesToday > 0) {
        insights.push(`${duplicatesToday} duplicate transaction${duplicatesToday > 1 ? 's' : ''} detected and excluded`);
    }

    return insights;
}

// ═════════════════════════════════════════════════════════════
//  SPENDING ACTIONS
// ═════════════════════════════════════════════════════════════

export async function addQuickSpend(formData: FormData) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        const amount = parseFloat(formData.get("amount") as string);
        const description = (formData.get("description") as string) || "Quick spend";
        const categoryId = formData.get("categoryId") as string;

        if (!amount || amount <= 0) {
            return { success: false, error: "Amount required" };
        }

        // Smart dedupe: check for exact duplicates in last 5 min
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const normalizedDesc = description.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        const duplicate = await prisma.transaction.findFirst({
            where: {
                amount,
                date: { gte: fiveMinAgo },
                type: "expense",
            },
        });

        const isDuplicate = !!duplicate;

        const tx = await prisma.transaction.create({
            data: {
                amount,
                description,
                date: new Date(),
                type: "expense",
                isDiscretionary: true,
                isTransfer: false,
                isRecurring: false,
                isDuplicate,
                duplicateOfId: duplicate?.id || null,
                fingerprint: `${amount}-${normalizedDesc}-${new Date().toISOString().slice(0, 10)}`,
                source: "manual",
                categoryId: categoryId || null,
            },
        });

        revalidatePath("/daily");
        revalidatePath("/");
        return { success: true, isDuplicate, data: tx };
    } catch (error) {
        console.error("Quick spend error:", error);
        return { success: false, error: "Failed to add spending" };
    }
}

export async function deleteTransactionAndRevalidate(id: string) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        await prisma.transaction.delete({ where: { id } });
        revalidatePath("/daily");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Delete failed" };
    }
}

// ═════════════════════════════════════════════════════════════
//  DEDUPE & CLEANUP
// ═════════════════════════════════════════════════════════════

export async function findAndMergeDuplicates() {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        const recent = await prisma.transaction.findMany({
            where: { type: "expense", date: { gte: subDays(new Date(), 30) } },
            orderBy: { date: "desc" },
        });

        const seen = new Map<string, string>();
        let merged = 0;

        for (const tx of recent) {
            const normalized = tx.description.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            const key = `${tx.amount}-${normalized}-${tx.date.toISOString().slice(0, 10)}`;
            
            if (seen.has(key)) {
                await prisma.transaction.update({
                    where: { id: tx.id },
                    data: { isDuplicate: true, duplicateOfId: seen.get(key)! },
                });
                merged++;
            } else {
                seen.set(key, tx.id);
            }
        }

        revalidatePath("/daily");
        return { success: true, data: { merged } };
    } catch (error) {
        return { success: false, error: "Dedupe failed" };
    }
}

// ═════════════════════════════════════════════════════════════
//  UTILS
// ═════════════════════════════════════════════════════════════

function fmt(amount: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function getDaysInCurrentMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

// ═════════════════════════════════════════════════════════════
//  STREAK ENGINE
// ═════════════════════════════════════════════════════════════

async function calculateStreak(dailyAllowance: number): Promise<number> {
    try {
        if (dailyAllowance <= 0) return 0;
        let streak = 0;
        for (let i = 0; i < 30; i++) {
            const day = subDays(new Date(), i);
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);

            const spent = await prisma.transaction.aggregate({
                where: {
                    type: "expense",
                    date: { gte: dayStart, lte: dayEnd },
                    isDiscretionary: true,
                    isDuplicate: false,
                },
                _sum: { amount: true },
            });

            const total = spent._sum.amount || 0;
            if (i === 0 && total === 0) continue; // no spending today = neutral
            if (total <= dailyAllowance) {
                streak++;
            } else {
                // If today is the first day and already over, it's a negative streak
                if (i === 0 && total > dailyAllowance) streak = -1;
                break;
            }
        }
        return streak;
    } catch {
        return 0;
    }
}

async function calculateBestStreak(dailyAllowance: number): Promise<number> {
    try {
        if (dailyAllowance <= 0) return 0;
        const txs = await prisma.transaction.findMany({
            where: {
                type: "expense",
                isDiscretionary: true,
                isDuplicate: false,
                date: { gte: subDays(new Date(), 90) },
            },
            orderBy: { date: "asc" },
            select: { date: true, amount: true },
        });

        const dayMap = new Map<string, number>();
        for (const tx of txs) {
            const key = tx.date.toISOString().slice(0, 10);
            dayMap.set(key, (dayMap.get(key) || 0) + tx.amount);
        }

        let best = 0;
        let current = 0;
        const sortedDays = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [, total] of sortedDays) {
            if (total <= dailyAllowance) {
                current++;
                best = Math.max(best, current);
            } else {
                current = 0;
            }
        }
        return best;
    } catch {
        return 0;
    }
}
