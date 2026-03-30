export const dynamic = "force-dynamic";

import { getTransactions } from "@/app/_actions/transactions";
import { prisma } from "@/lib/prisma";
import { TransactionsClient } from "./TransactionsClient";

export default async function TransactionsPage() {
    const [{ data: transactions }, categories] = await Promise.all([
        getTransactions(),
        prisma.category.findMany({ orderBy: { name: "asc" } }),
    ]);

    return <TransactionsClient transactions={transactions || []} categories={categories} />;
}
