import { Transaction } from "@prisma/client";

export function detectRecurringPattern(transactions: Transaction[]) {
    // Basic logic: if similar description and similar amount occur every 30 days
    // This needs a much more advanced implementation for production.
    // Starting with a stub.
    
    // Group by description
    const groups: Record<string, Transaction[]> = {};
    for (const t of transactions) {
        if (!groups[t.description]) groups[t.description] = [];
        groups[t.description].push(t);
    }
    
    const recurring = [];
    for (const [description, ts] of Object.entries(groups)) {
        if (ts.length >= 3) {
            recurring.push({ description, count: ts.length });
        }
    }
    return recurring;
}
