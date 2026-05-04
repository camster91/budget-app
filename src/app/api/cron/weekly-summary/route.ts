import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subWeeks, startOfWeek, endOfWeek, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    // Basic auth check for cron jobs
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || "dev-cron-secret"}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const users = await prisma.user.findMany({
            where: { householdId: { not: null } },
            include: { household: true },
        });

        const target = subWeeks(new Date(), 1);
        const start = startOfWeek(target, { weekStartsOn: 1 });
        const end = endOfWeek(target, { weekStartsOn: 1 });

        let emailsSent = 0;

        for (const user of users) {
            if (!user.householdId) continue;

            const transactions = await prisma.transaction.findMany({
                where: {
                    householdId: user.householdId,
                    date: { gte: start, lte: end },
                    type: "expense",
                    isDuplicate: false,
                },
                include: { category: true },
            });

            if (transactions.length === 0) continue;

            const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);

            // In a real app, this would use Resend, SendGrid, etc.
            console.log(`[EMAIL MOCK] To: ${user.email}`);
            console.log(`[EMAIL MOCK] Subject: Your Weekly Spending Summary (${format(start, "MMM d")} - ${format(end, "MMM d")})`);
            console.log(`[EMAIL MOCK] Body: You spent a total of $${totalSpent.toFixed(2)} across ${transactions.length} transactions last week.`);
            
            emailsSent++;
        }

        return NextResponse.json({ success: true, emailsSent, period: `${start.toISOString()} to ${end.toISOString()}` });
    } catch (error) {
        console.error("Weekly summary cron failed:", error);
        return NextResponse.json({ success: false, error: "Cron failed" }, { status: 500 });
    }
}
