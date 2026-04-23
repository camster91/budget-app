"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ParsedReceipt {
    total?: number;
    merchant?: string;
    date?: string;
    items: { name: string; price: number; qty: number }[];
    confidence: number;
    rawText: string;
}

export async function saveReceiptParse(input: {
    imageUrl: string;
    rawText: string;
    parsed: ParsedReceipt;
}) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        const receipt = await prisma.screenshotReceipt.create({
            data: {
                imageUrl: input.imageUrl,
                rawMerchant: input.parsed.merchant ?? null,
                rawAmount: input.parsed.total ?? null,
                rawDate: input.parsed.date ? new Date(input.parsed.date) : null,
                rawItems: input.parsed.items.length > 0 ? JSON.stringify(input.parsed.items) : null,
                confidence: input.parsed.confidence,
                status: "pending",
            },
        });

        const categoryId = await suggestCategoryForMerchant(input.parsed.merchant);

        return {
            success: true,
            data: {
                receipt,
                suggestedCategoryId: categoryId,
                suggestedAmount: input.parsed.total,
                suggestedDate: input.parsed.date,
            },
        };
    } catch (error) {
        console.error("Receipt parse save error:", error);
        return { success: false, error: "Failed to save receipt" };
    }
}

async function suggestCategoryForMerchant(merchant?: string): Promise<string | null> {
    if (!merchant) return null;
    const normalized = merchant.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const learned = await prisma.$queryRaw<{ categoryId: string; hits: bigint }[]>`
        WITH cleaned AS (
            SELECT REGEXP_REPLACE(LOWER(description), '[^a-z0-9 ]', '', 'g') AS merchant, "categoryId"
            FROM "Transaction" WHERE type = 'expense' AND "categoryId" IS NOT NULL
        )
        SELECT "categoryId", COUNT(*)::bigint AS hits
        FROM cleaned
        WHERE merchant = ${normalized}
        GROUP BY "categoryId"
        ORDER BY hits DESC
        LIMIT 1
    `;

    return learned.length > 0 ? learned[0].categoryId : null;
}

export async function getPendingReceipts() {
    try {
        const receipts = await prisma.screenshotReceipt.findMany({
            where: { status: "pending" },
            orderBy: { createdAt: "desc" },
            take: 20,
        });
        return { success: true, data: receipts };
    } catch (error) {
        return { success: false, error: "Failed to fetch receipts" };
    }
}

export async function approveReceipt(receiptId: string, overrides?: {
    amount?: number; merchant?: string; date?: Date; categoryId?: string;
}) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        const receipt = await prisma.screenshotReceipt.findUnique({ where: { id: receiptId } });
        if (!receipt) return { success: false, error: "Receipt not found" };

        const amount = overrides?.amount ?? receipt.rawAmount ?? 0;
        const description = overrides?.merchant ?? receipt.rawMerchant ?? "Receipt";
        const date = overrides?.date ?? receipt.rawDate ?? new Date();

        let categoryId = overrides?.categoryId;
        if (!categoryId && receipt.rawMerchant) {
            categoryId = await suggestCategoryForMerchant(receipt.rawMerchant) || null;
        }

        const tx = await prisma.transaction.create({
            data: {
                amount,
                description,
                date,
                type: "expense",
                isDiscretionary: true,
                source: "screenshot",
                categoryId: categoryId || null,
            },
        });

        await prisma.screenshotReceipt.update({
            where: { id: receiptId },
            data: { status: "processed", transactionId: tx.id },
        });

        revalidatePath("/daily");
        return { success: true, data: tx };
    } catch (error) {
        return { success: false, error: "Failed to approve receipt" };
    }
}

export async function rejectReceipt(receiptId: string) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        await prisma.screenshotReceipt.update({
            where: { id: receiptId },
            data: { status: "rejected" },
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to reject" };
    }
}

export async function getSmartMerchantSuggestions(query: string): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
        const normalized = query.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        if (!normalized || normalized.length < 2) return { success: true, data: [] };

        const suggestions = await prisma.$queryRaw<{ description: string; count: bigint }[]>`
            SELECT REGEXP_REPLACE(LOWER(description), '[^a-z0-9 ]', '', 'g') AS description,
                   COUNT(*)::bigint AS count
            FROM "Transaction"
            WHERE type = 'expense'
                AND REGEXP_REPLACE(LOWER(description), '[^a-z0-9 ]', '', 'g') LIKE '%' || ${normalized} || '%'
            GROUP BY REGEXP_REPLACE(LOWER(description), '[^a-z0-9 ]', '', 'g')
            ORDER BY count DESC
            LIMIT 5
        `;

        return { success: true, data: suggestions.map(s => s.description).filter(Boolean) };
    } catch (error) {
        return { success: false, error: "Failed to get suggestions" };
    }
}
