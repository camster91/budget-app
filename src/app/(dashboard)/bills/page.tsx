export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { BillsClient } from "./BillsClient";
import { BillCalendarView } from "./BillCalendarView";

export default async function BillsPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [bills, categories, accounts, paidThisMonth] = await Promise.all([
        prisma.bill.findMany({
            where: { householdId: user.householdId, isActive: true },
            include: { category: true, account: true },
            orderBy: { dueDay: "asc" },
        }),
        prisma.category.findMany({
            where: { householdId: user.householdId },
            orderBy: { name: "asc" },
        }),
        prisma.account.findMany({
            where: { householdId: user.householdId },
            orderBy: { name: "asc" },
        }),
        // Bills paid this month via transactions
        prisma.transaction.findMany({
            where: {
                householdId: user.householdId,
                billId: { not: null },
                date: { gte: startOfMonth },
            },
            select: { billId: true },
        }),
    ]);

    const paidBillIds = new Set(
        paidThisMonth.map(t => t.billId).filter((id): id is string => id !== null)
    );

    return (
        <div className="flex flex-col gap-8">
            <BillsClient
                bills={bills}
                categories={categories}
                accounts={accounts}
                paidBillIds={paidBillIds}
            />
            <BillCalendarView
                bills={bills}
                paidBillIds={paidBillIds}
            />
        </div>
    );
}