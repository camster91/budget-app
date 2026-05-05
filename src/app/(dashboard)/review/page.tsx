import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getWeeklyReview, getMonthlyReview } from "@/app/_actions/review";
import { getLearnedMerchantRules, type MerchantRule } from "@/app/_actions/patterns";
import { getCategories } from "@/app/_actions/categories";
import { getAccounts } from "@/app/_actions/accounts";
import { detectRecurringPattern } from "@/lib/recurring/detector";
import { prisma } from "@/lib/prisma";
import { ReviewClient } from "./ReviewClient";
import { format, subMonths } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    // Load categories and accounts for the panel
    const [categoriesResult, accounts] = await Promise.all([
        getCategories(),
        getAccounts(),
    ]);

    // Load learned merchant rules
    const learnedRulesResult = await getLearnedMerchantRules();
    const learnedRules: MerchantRule[] = learnedRulesResult.data || [];

    // Load recurring transactions for bill suggestions
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);
    const recentTransactions = await prisma.transaction.findMany({
        where: {
            householdId: user.householdId,
            type: "expense",
            date: { gte: threeMonthsAgo },
            isDuplicate: false,
        },
        select: { id: true, description: true, amount: true, date: true, categoryId: true },
        orderBy: { date: "asc" },
    });

    const recurringPatterns = detectRecurringPattern(recentTransactions as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const categories = categoriesResult.data || [];

    // Map recurring patterns to suggested bills
    const suggestedBills = recurringPatterns
        .filter(r => r.count >= 3 && r.frequency === "monthly")
        .map(r => {
            const cat = categories.find(c => c.name.toLowerCase().includes(r.description.split(" ")[0].toLowerCase()));
            return {
                name: r.description.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
                categoryId: cat?.id || "",
                categoryName: cat?.name || "General",
                avgAmount: r.avgAmount,
                frequency: r.frequency as "monthly" | "biweekly" | "weekly",
                confidence: Math.min(1, r.count / 6),
                accountId: "",
            };
        });

    const [{ data: weekly }, { data: monthly }] = await Promise.all([
        getWeeklyReview(),
        getMonthlyReview(),
    ]);

    const months = Array.from({ length: 12 }, (_, i) =>
        format(subMonths(new Date(), i), "yyyy-MM")
    );

    return (
        <ReviewClient
            initialWeekly={weekly || null}
            initialMonthly={monthly || null}
            months={months}
            learnedRules={learnedRules}
            suggestedBills={suggestedBills}
            categories={categories.map(c => ({ id: c.id, name: c.name }))}
            accounts={accounts.map(a => ({ id: a.id, name: a.name }))}
        />
    );
}