"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isTransfer } from "@/lib/utils/transactionUtils";
import { categorizeTransaction } from "@/lib/categorization/rulesEngine";
import { getAuthUser } from "@/lib/auth";
import { toCents } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CSVRow = Record<string, any>;

export interface ImportOptions {
    skipTransfers: boolean;
    autoCategorize: boolean;
}

export interface ImportResult {
    success: boolean;
    imported?: number;
    errors?: { row: number; error: string }[];
    failed?: number;
    skipped?: number;
    error?: string;
}

/**
 * Determine the transaction type from CSV row data.
 * Prefers explicit Type column, falls back to amount sign detection.
 */
function detectType(row: CSVRow, amount: number): "income" | "expense" {
    const explicitType = row['Type'] || row['type'];
    if (explicitType) {
        const lower = explicitType.toLowerCase().trim();
        if (lower === 'income' || lower === 'credit' || lower === 'deposit') return 'income';
        if (lower === 'expense' || lower === 'debit' || lower === 'withdrawal') return 'expense';
    }
    // Fallback: negative amounts are expenses, positive are income
    // Some banks export expenses as positive numbers — use amount < 0 only as last resort
    // When amount is positive and no explicit type column, default to expense to be safe
    return amount < 0 ? 'expense' : 'income';
}

/**
 * Determine isDiscretionary based on transaction type and category assignment.
 * - Income is never discretionary
 * - Categorized expenses are non-discretionary (the category defines the spend type)
 * - Uncategorized expenses default to discretionary
 */
function determineDiscretionary(type: "income" | "expense", hasCategory: boolean): boolean {
    if (type === 'income') return false;
    if (hasCategory) return false; // Has a category — assume non-discretionary
    return true; // Uncategorized expense — default to discretionary
}

export async function importCSVTransactions(data: CSVRow[], options: ImportOptions): Promise<ImportResult> {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        let importedCount = 0;
        let skippedCount = 0;
        const errors: { row: number; error: string }[] = [];

        // Fetch categories for auto-categorization
        const categories = options.autoCategorize ? await prisma.category.findMany() : [];

        for (const [index, row] of data.entries()) {
            const csvRowNumber = index + 1; // 1-based for user-facing messages
            try {
                // Map CSV headers to database fields
                const description = row['Description'] || row['description'] || '';
                const amountRaw = parseFloat(String(row['Amount'] || row['amount'] || '0'));
                const amount = toCents(amountRaw);
                const dateStr = row['Date'] || row['date'] || new Date().toISOString();

                if (!description || isNaN(amount)) {
                    errors.push({ row: csvRowNumber, error: 'Missing or invalid required fields' });
                    continue;
                }

                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    errors.push({ row: csvRowNumber, error: 'Invalid date format' });
                    continue;
                }

                const isTransferTransaction = isTransfer(description);

                if (options.skipTransfers && isTransferTransaction) {
                    skippedCount++;
                    continue;
                }

                const type = detectType(row, amount);

                let categoryId = row['categoryId'] || row['category_id'] || '';
                if (!categoryId && options.autoCategorize) {
                    categoryId = categorizeTransaction(description, categories) || '';
                }

                await prisma.transaction.create({
                    data: {
                        amount: Math.abs(amount),
                        description,
                        date,
                        type,
                        isTransfer: isTransferTransaction,
                        isDiscretionary: determineDiscretionary(type, !!categoryId),
                        categoryId: categoryId || null,
                        householdId: user.householdId,
                    },
                });

                importedCount++;
            } catch (e) {
                console.error("Failed to save transaction row %d:", csvRowNumber, row, e);
                errors.push({ row: csvRowNumber, error: `Failed to save transaction: ${e instanceof Error ? e.message : 'Unknown error'}` });
            }
        }

        revalidatePath("/transactions");
        revalidatePath("/");
        
        const failedCount = errors.length;
        return {
            success: true,
            imported: importedCount,
            skipped: skippedCount,
            failed: failedCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    } catch (error) {
        console.error("Failed to import transactions:", error);
        return { success: false, error: "Failed to import transactions" };
    }
}
