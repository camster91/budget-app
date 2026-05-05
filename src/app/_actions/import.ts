"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isTransfer } from "@/lib/utils/transactionUtils";
import { categorizeTransaction } from "@/lib/categorization/rulesEngine";
import { getAuthUser } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CSVRow = Record<string, any>;

export interface ImportOptions {
    skipTransfers: boolean;
    autoCategorize: boolean;
}

export async function importCSVTransactions(data: CSVRow[], options: ImportOptions) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        let importedCount = 0;
        const errors = [];

        // Fetch categories for auto-categorization
        const categories = options.autoCategorize ? await prisma.category.findMany() : [];

        for (const row of data) {
            try {
                // Map CSV headers to database fields
                const description = row['Description'] || row['description'] || '';
                const amount = parseFloat(String(row['Amount'] || row['amount'] || '0'));
                const dateStr = row['Date'] || row['date'] || new Date().toISOString();
                const type = row['Type'] || row['type'] || (amount < 0 ? 'expense' : 'income');

                if (!description || isNaN(amount)) {
                    errors.push({ row: importedCount + 1, error: 'Missing or invalid required fields' });
                    continue;
                }

                const date = new Date(dateStr);
                const isTransferTransaction = isTransfer(description);

                if (options.skipTransfers && isTransferTransaction) {
                    continue;
                }

                let categoryId = row['categoryId'] || row['category_id'];
                if (!categoryId && options.autoCategorize) {
                    categoryId = categorizeTransaction(description, categories);
                }

                await prisma.transaction.create({
                    data: {
                        amount: Math.abs(amount),
                        description,
                        date,
                        type: type.toLowerCase() === 'income' || amount > 0 ? 'income' : 'expense',
                        isTransfer: isTransferTransaction,
                        categoryId,
                        householdId: user.householdId,
                    },
                });

                importedCount++;
            } catch (e) {
                console.error("Failed to save transaction row:", row, e);
                errors.push({ row: importedCount + 1, error: 'Failed to save transaction' });
            }
        }

        revalidatePath("/transactions");
        revalidatePath("/");
        
        return { success: true, imported: importedCount, errors };
    } catch (error) {
        console.error("Failed to import transactions:", error);
        return { success: false, error: "Failed to import transactions" };
    }
}
