"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isTransfer } from "@/lib/utils/transactionUtils";

export type CSVRow = Record<string, string>;

export interface ImportOptions {
    skipTransfers: boolean;
    autoCategorize: boolean;
}

export async function importCSVTransactions(data: CSVRow[], options: ImportOptions) {
    try {
        let importedCount = 0;
        const errors = [];

        for (const row of data) {
            try {
                // Map CSV headers to database fields (this will need adjustment based on specific CSV format)
                // Assuming generic CSV structure: date, description, amount, type (or just description, amount)
                const description = row['Description'] || row['description'] || '';
                const amount = parseFloat(row['Amount'] || row['amount'] || '0');
                const dateStr = row['Date'] || row['date'] || new Date().toISOString();
                const type = row['Type'] || row['type'] || (amount < 0 ? 'expense' : 'income');

                if (!description || !amount) {
                    errors.push({ row: importedCount + 1, error: 'Missing required fields' });
                    continue;
                }

                const date = new Date(dateStr);
                const isTransferTransaction = isTransfer(description);

                if (options.skipTransfers && isTransferTransaction) {
                    continue;
                }

                await prisma.transaction.create({
                    data: {
                        amount: Math.abs(amount),
                        description,
                        date,
                        type: type.toLowerCase() === 'income' || amount > 0 ? 'income' : 'expense',
                        isTransfer: isTransferTransaction,
                    },
                });

                importedCount++;
            } catch (e) {
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
