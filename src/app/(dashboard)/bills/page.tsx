export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { BillsClient } from "./BillsClient";

export default async function BillsPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const [bills, categories, accounts] = await Promise.all([
        prisma.bill.findMany({
            where: { householdId: user.householdId },
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
    ]);

    return <BillsClient bills={bills} categories={categories} accounts={accounts} />;
}