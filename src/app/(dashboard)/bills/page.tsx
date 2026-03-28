export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { BillsClient } from "./BillsClient";

export default async function BillsPage() {
    const [bills, categories, accounts] = await Promise.all([
        prisma.bill.findMany({
            include: { category: true, account: true },
            orderBy: { dueDay: "asc" },
        }),
        prisma.category.findMany({ orderBy: { name: "asc" } }),
        prisma.account.findMany({ orderBy: { name: "asc" } }),
    ]);

    return <BillsClient bills={bills} categories={categories} accounts={accounts} />;
}
