"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid";
import { decrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { RemovedTransaction, Transaction as PlaidTransaction } from "plaid";
import { categorizeTransaction } from "@/lib/categorization/rulesEngine";

export async function syncPlaidTransactions(accountId: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const account = await prisma.account.findFirst({
            where: { id: accountId, householdId: user.householdId },
        });

        if (!account || !account.plaidAccessToken) {
            return { success: false, error: "Account not linked to Plaid" };
        }

        const accessToken = decrypt(account.plaidAccessToken);
        const categories = await prisma.category.findMany({
            where: { householdId: user.householdId }
        });

        let cursor = account.plaidCursor || undefined;
        let added: PlaidTransaction[] = [];
        let modified: PlaidTransaction[] = [];
        let removed: RemovedTransaction[] = [];
        let hasMore = true;

        // Iterate through each page of new transaction updates for item
        while (hasMore) {
            const response = await plaidClient.transactionsSync({
                access_token: accessToken,
                cursor: cursor,
            });

            const data = response.data;
            added = added.concat(data.added);
            modified = modified.concat(data.modified);
            removed = removed.concat(data.removed);
            hasMore = data.has_more;
            cursor = data.next_cursor;
        }

        // Process additions
        for (const pt of added) {
            const amount = pt.amount; // Plaid: positive is outflow, negative is inflow
            const type = amount > 0 ? "expense" : "income";
            const absAmount = Math.abs(amount);
            const date = new Date(pt.date);
            const description = pt.merchant_name || pt.name;
            
            // Dedupe check
            const normalizedDesc = description.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            const fingerprint = `${absAmount}-${normalizedDesc}-${pt.date}`;

            const existing = await prisma.transaction.findFirst({
                where: {
                    householdId: user.householdId,
                    OR: [
                        { statementId: pt.transaction_id },
                        { fingerprint }
                    ]
                }
            });

            if (existing) {
                // If it exists but doesn't have a statementId yet (e.g. manual entry we are now linking)
                // update it with the statementId to prevent future duplicates
                if (!existing.statementId) {
                    await prisma.transaction.update({
                        where: { id: existing.id, householdId: user.householdId },
                        data: { statementId: pt.transaction_id, source: "plaid" }
                    });
                }
                continue;
            }

            // Auto-categorization
            const categoryId = categorizeTransaction(description, categories);

            await prisma.transaction.create({
                data: {
                    amount: absAmount,
                    description,
                    date,
                    type,
                    statementId: pt.transaction_id,
                    fingerprint,
                    source: "plaid",
                    accountId: account.id,
                    categoryId,
                    isDiscretionary: type === "expense",
                    reconciled: true,
                    householdId: user.householdId,
                }
            });
        }

        // Process modifications
        for (const pt of modified) {
            const amount = pt.amount;
            const type = amount > 0 ? "expense" : "income";
            const absAmount = Math.abs(amount);
            const description = pt.merchant_name || pt.name;

            await prisma.transaction.updateMany({
                where: { statementId: pt.transaction_id, householdId: user.householdId },
                data: {
                    amount: absAmount,
                    description,
                    date: new Date(pt.date),
                    type,
                }
            });
        }

        // Process removals
        for (const pt of removed) {
            await prisma.transaction.deleteMany({
                where: { statementId: pt.transaction_id, householdId: user.householdId }
            });
        }

        // Update account with new cursor and last synced time
        await prisma.account.update({
            where: { id: accountId, householdId: user.householdId },
            data: {
                plaidCursor: cursor,
                plaidLastSynced: new Date(),
            }
        });

        revalidatePath("/transactions");
        revalidatePath("/accounts");
        revalidatePath("/daily");
        revalidatePath("/");

        return { 
            success: true, 
            data: { 
                added: added.length, 
                modified: modified.length, 
                removed: removed.length 
            } 
        };
    } catch (error) {
        console.error("Plaid sync error:", error);
        return { success: false, error: "Failed to sync transactions" };
    }
}
