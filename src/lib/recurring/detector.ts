import { Transaction } from "@prisma/client";

export function detectRecurringPattern(transactions: Transaction[]) {
    // Basic logic: if similar description and similar amount occur regularly (e.g. monthly)
    
    // Group by normalized description (lowercase, no numbers)
    const groups: Record<string, Transaction[]> = {};
    for (const t of transactions) {
        const normalized = t.description.toLowerCase().replace(/\d/g, '').trim();
        if (!groups[normalized]) groups[normalized] = [];
        groups[normalized].push(t);
    }
    
    const recurring = [];
    for (const [description, ts] of Object.entries(groups)) {
        if (ts.length < 2) continue;
        
        // Sort by date
        ts.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Calculate intervals in days
        const intervals = [];
        for (let i = 1; i < ts.length; i++) {
            const diff = (ts[i].date.getTime() - ts[i-1].date.getTime()) / (1000 * 60 * 60 * 24);
            intervals.push(diff);
        }
        
        // Check if intervals are somewhat consistent (e.g., around 30 days)
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - avgInterval, 2), 0) / intervals.length;
        
        // If interval is ~30 days (monthly), ~14 days (bi-weekly), or ~7 days (weekly)
        // with low variance
        const isMonthly = avgInterval >= 25 && avgInterval <= 35;
        const isBiWeekly = avgInterval >= 10 && avgInterval <= 18;
        const isWeekly = avgInterval >= 5 && avgInterval <= 9;
        
        if ((isMonthly || isBiWeekly || isWeekly) && variance < 25) {
            recurring.push({ 
                description: ts[0].description, // Use original description of first tx
                avgAmount: ts.reduce((a, b) => a + b.amount, 0) / ts.length,
                frequency: isMonthly ? "monthly" : isBiWeekly ? "bi-weekly" : "weekly",
                count: ts.length,
                lastSeen: ts[ts.length - 1].date
            });
        }
    }
    return recurring;
}
