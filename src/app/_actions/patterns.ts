"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

// ═════════════════════════════════════════════════════════════
//  SPENDING PATTERN DETECTION ENGINE
// ═════════════════════════════════════════════════════════════

export interface SpendingPattern {
    name: string;
    description: string;
    pattern: "recurring_merchant" | "time_of_day" | "weekend_spike" | "category_surge" | "unusual";
    amount: number;
    confidence: number; // 0-1
    suggestion?: string;
}

export async function detectSpendingPatterns(): Promise<{ success: boolean; data?: SpendingPattern[]; error?: string }> {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const now = new Date();
        const patterns: SpendingPattern[] = [];

        // 1. Recurring merchant detection
        const merchantGroups = await prisma.$queryRaw<
            { description: string; count: bigint; avg: number; stddev: number }[]
        >`
            WITH cleaned AS (
                SELECT 
                    REGEXP_REPLACE(LOWER(description), '[^a-z0-9 ]', '', 'g') AS merchant,
                    amount,
                    date
                FROM "Transaction"
                WHERE type = 'expense'
                AND "householdId" = ${user.householdId}
                AND date >= ${subMonths(now, 3)}
                AND isDuplicate = false
            )
            SELECT merchant AS description, COUNT(*) as count, AVG(amount) as avg, STDDEV(amount) as stddev
            FROM cleaned
            GROUP BY merchant
            HAVING COUNT(*) >= 2 AND AVG(amount) > 5
            ORDER BY COUNT(*) DESC, stddev ASC
            LIMIT 10
        `;

        for (const mg of merchantGroups) {
            const count = Number(mg.count);
            const stddev = Number(mg.stddev) || 0;
            const avg = Number(mg.avg);
            const cv = avg > 0 ? stddev / avg : 1;
            const confidence = Math.min(1, count / 6) * Math.max(0, 1 - cv);

            if (confidence > 0.5) {
                patterns.push({
                    name: mg.description,
                    description: `${count} transactions in the last 3 months`,
                    pattern: "recurring_merchant",
                    amount: avg,
                    confidence,
                    suggestion: `You visit ${mg.description.split(" ")[0]} about ${Math.round(count / 3)} times/month. Budget ~${fmt(avg)}.`,
                });
            }
        }

        // 2. Time-of-day analysis
        const hourlySpending = await prisma.$queryRaw<
            { hour: number; total: number; count: bigint }[]
        >`
            SELECT EXTRACT(hour FROM date)::int AS hour, SUM(amount)::float AS total, COUNT(*)::bigint
            FROM "Transaction"
            WHERE type = 'expense' AND "householdId" = ${user.householdId} AND date >= ${subMonths(now, 1)}
            AND isDuplicate = false
            GROUP BY hour
            ORDER BY total DESC
            LIMIT 3
        `;

        const totalMonthSpend = hourlySpending.reduce((s, h) => s + h.total, 0);
        for (const hs of hourlySpending) {
            const pct = totalMonthSpend > 0 ? hs.total / totalMonthSpend : 0;
            if (pct > 0.25) {
                const hour12 = hs.hour > 12 ? hs.hour - 12 : (hs.hour === 0 ? 12 : hs.hour);
                const ampm = hs.hour >= 12 ? "PM" : "AM";
                patterns.push({
                    name: "Peak Spending Time",
                    description: `${hour12}${ampm} is your peak spending hour`,
                    pattern: "time_of_day",
                    amount: hs.total,
                    confidence: Math.min(1, pct * 2),
                    suggestion: `You spend ${Math.round(pct * 100)}% of your money around ${hour12}${ampm}. That's when you need to be most disciplined.`,
                });
            }
        }

        // 3. Weekend vs weekday
        const weekendVsWeekday = await prisma.$queryRaw<
            { is_weekend: boolean; total: number }[]
        >`
            SELECT 
                EXTRACT(dow FROM date) IN (0,6) AS is_weekend,
                SUM(amount)::float AS total
            FROM "Transaction"
            WHERE type = 'expense' AND "householdId" = ${user.householdId} AND date >= ${subMonths(now, 2)}
            AND isDuplicate = false
            GROUP BY is_weekend
        `;

        if (weekendVsWeekday.length === 2) {
            const weekend = weekendVsWeekday.find(w => w.is_weekend)?.total || 0;
            const weekday = weekendVsWeekday.find(w => !w.is_weekend)?.total || 0;
            const total = weekend + weekday;
            if (total > 0) {
                const weekendPct = weekend / total;
                if (weekendPct > 0.45) {
                    patterns.push({
                        name: "Weekend Spender",
                        description: `${Math.round(weekendPct * 100)}% of spending happens on weekends`,
                        pattern: "weekend_spike",
                        amount: weekend,
                        confidence: Math.min(1, weekendPct * 2.2),
                        suggestion: "Try pre-planning weekend spending with a cash envelope method.",
                    });
                }
            }
        }

        // 4. Category surge detection (last week vs avg)
        const categoryTrends = await prisma.$queryRaw<
            { category_name: string; last_week: number; avg_week: number }[]
        >`
            WITH weekly AS (
                SELECT 
                    c.name AS category_name,
                    DATE_TRUNC('week', t.date) AS week,
                    SUM(t.amount)::float AS weekly_total
                FROM "Transaction" t
                LEFT JOIN "Category" c ON t."categoryId" = c.id
                WHERE t.type = 'expense' AND t."householdId" = ${user.householdId} AND t.isDuplicate = false
                GROUP BY c.name, DATE_TRUNC('week', t.date)
            )
            SELECT 
                category_name,
                (SELECT SUM(weekly_total) FROM weekly w2 WHERE w2.category_name = w.category_name AND w2.week = DATE_TRUNC('week', NOW()) - INTERVAL '1 week') AS last_week,
                (SELECT AVG(weekly_total) FROM weekly w3 WHERE w3.category_name = w.category_name AND w3.week < DATE_TRUNC('week', NOW()) - INTERVAL '1 week') AS avg_week
            FROM weekly w
            WHERE w.week >= DATE_TRUNC('week', NOW()) - INTERVAL '4 weeks'
            GROUP BY category_name
            HAVING (SELECT AVG(weekly_total) FROM weekly w3 WHERE w3.category_name = w.category_name AND w3.week < DATE_TRUNC('week', NOW()) - INTERVAL '1 week') > 0
        `;

        for (const ct of categoryTrends) {
            if (ct.last_week > ct.avg_week * 1.5) {
                patterns.push({
                    name: `${ct.category_name || "Unknown"} Surge`,
                    description: `${fmt(ct.last_week)} last week vs ${fmt(ct.avg_week)} average`,
                    pattern: "category_surge",
                    amount: ct.last_week,
                    confidence: Math.min(1, (ct.last_week / ct.avg_week) * 0.5),
                    suggestion: `${ct.category_name || "Spending"} jumped ${Math.round((ct.last_week / ct.avg_week) * 100)}% last week. Any one-off purchases?`,
                });
            }
        }

        // Cap and sort
        return { success: true, data: patterns.slice(0, 6) };
    } catch (error) {
        console.error("Pattern detection error:", error);
        return { success: false, error: "Failed to analyze patterns" };
    }
}

// ═════════════════════════════════════════════════════════════
//  LEARNED MERCHANT → CATEGORY MAPPINGS
// ═════════════════════════════════════════════════════════════

export interface MerchantRule {
    merchant: string;
    categoryId: string;
    categoryName: string;
    hits: number;
    confidence: number; // hits / total for this merchant
}

export async function getLearnedMerchantRules(): Promise<{ success: boolean; data?: MerchantRule[]; error?: string }> {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const rules = await prisma.$queryRaw<
            { merchant: string; categoryId: string; categoryName: string; hits: bigint; total: bigint }[]
        >`
            WITH cleaned AS (
                SELECT 
                    REGEXP_REPLACE(LOWER(description), '[^a-z0-9 ]', '', 'g') AS merchant,
                    "categoryId",
                    c.name AS "categoryName"
                FROM "Transaction" t
                LEFT JOIN "Category" c ON t."categoryId" = c.id
                WHERE type = 'expense' AND "categoryId" IS NOT NULL AND t.isDuplicate = false
                AND t."householdId" = ${user.householdId}
            )
            SELECT merchant, "categoryId", "categoryName",
                COUNT(*)::bigint AS hits,
                SUM(COUNT(*)) OVER (PARTITION BY merchant)::bigint AS total
            FROM cleaned
            WHERE LENGTH(merchant) > 2
            GROUP BY merchant, "categoryId", "categoryName"
            HAVING COUNT(*) >= 2
            ORDER BY merchant, hits DESC
        `;

        const deduped: MerchantRule[] = [];
        const seen = new Set<string>();
        for (const r of rules) {
            const key = `${r.merchant}-${r.categoryId}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const confidence = Number(r.total) > 0 ? Number(r.hits) / Number(r.total) : 0;
            if (confidence >= 0.5) {
                deduped.push({
                    merchant: r.merchant,
                    categoryId: r.categoryId,
                    categoryName: r.categoryName,
                    hits: Number(r.hits),
                    confidence,
                });
            }
        }

        return { success: true, data: deduped };
    } catch (error) {
        console.error("Merchant rules error:", error);
        return { success: false, error: "Failed to load merchant rules" };
    }
}

// ═════════════════════════════════════════════════════════════
//  HOURLY VELOCITY (TODAY)
// ═════════════════════════════════════════════════════════════

export interface HourlySpend {
    hour: string;
    amount: number;
    cumulative: number;
}

export async function getHourlyVelocity(): Promise<{ success: boolean; data?: HourlySpend[]; error?: string }> {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const hourly = await prisma.$queryRaw<
            { hour: number; amount: number }[]
        >`
            SELECT EXTRACT(hour FROM date)::int AS hour, SUM(amount)::float AS amount
            FROM "Transaction"
            WHERE type = 'expense' AND date >= ${todayStart}
            AND "householdId" = ${user.householdId}
            AND isDuplicate = false
            GROUP BY hour
            ORDER BY hour
        `;

        const result: HourlySpend[] = [];
        let cumulative = 0;
        for (let h = 0; h < 24; h += 2) {
            const spend = hourly.filter(x => x.hour >= h && x.hour < h + 2).reduce((s, x) => s + x.amount, 0);
            cumulative += spend;
            result.push({
                hour: `${h === 0 ? "12" : h > 12 ? h - 12 : h}${h < 12 ? "am" : "pm"}`,
                amount: spend,
                cumulative,
            });
        }

        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: "Failed to get velocity" };
    }
}

// ═════════════════════════════════════════════════════════════
//  DEDUPE REVIEW QUEUE
// ═════════════════════════════════════════════════════════════

export interface DuplicateSet {
    fingerprint: string;
    transactions: { id: string; description: string; amount: number; date: Date; source: string | null }[];
}

export async function getDuplicateReviewQueue(): Promise<{ success: boolean; data?: DuplicateSet[]; error?: string }> {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const duplicates = await prisma.$queryRaw<
            { id: string; description: string; amount: number; date: Date; fingerprint: string; source: string | null }[]
        >`
            SELECT id, description, amount, date, fingerprint, source
            FROM "Transaction"
            WHERE isDuplicate = true AND duplicateOfId IS NOT NULL
            AND "householdId" = ${user.householdId}
            AND date >= NOW() - INTERVAL '7 days'
            ORDER BY date DESC
            LIMIT 20
        `;

        const grouped = new Map<string, DuplicateSet["transactions"]>();
        for (const d of duplicates) {
            if (!grouped.has(d.fingerprint)) grouped.set(d.fingerprint, []);
            grouped.get(d.fingerprint)!.push(d);
        }

        const result: DuplicateSet[] = Array.from(grouped.entries())
            .filter(([, txs]) => txs.length >= 2)
            .map(([fingerprint, transactions]) => ({ fingerprint, transactions }));

        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: "Failed to load duplicates" };
    }
}

export async function keepAndMergeDuplicate(duplicateId: string, keepId: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        await prisma.$transaction([
            prisma.transaction.update({
                where: { id: duplicateId, householdId: user.householdId },
                data: { isDuplicate: false, duplicateOfId: null },
            }),
            prisma.transaction.delete({ where: { id: keepId, householdId: user.householdId } }),
        ]);
        revalidatePath("/daily");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Merge failed" };
    }
}

export async function rejectDuplicate(duplicateId: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        await prisma.transaction.update({
            where: { id: duplicateId, householdId: user.householdId },
            data: { isDuplicate: false, duplicateOfId: null },
        });
        revalidatePath("/daily");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Reject failed" };
    }
}

// ═════════════════════════════════════════════════════════════
//  UTILS
// ═════════════════════════════════════════════════════════════

function fmt(amount: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}
